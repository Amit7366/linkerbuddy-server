import { env } from "@/config/env.js";
import { AppError } from "@/utils/appError.js";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const RANGE_TTL_MS = 5 * 60 * 1000;
const LIVE_TTL_MS = 30 * 1000;

export type VisitorRange = "today" | "7d" | "30d";

export type VisitorPoint = {
  at: string;
  uniques: number;
  pageViews: number;
  requests: number;
};

export type VisitorMetric = {
  value: number;
  changePct: number;
};

export type VisitorReport =
  | { configured: false }
  | {
      configured: true;
      range: VisitorRange;
      uniques: VisitorMetric;
      pageViews: VisitorMetric;
      requests: VisitorMetric;
      series: VisitorPoint[];
      topPages: { path: string; requests: number }[];
      hostname: string | null;
      fetchedAt: string;
    };

export type LiveVisitors =
  | { configured: false }
  | {
      configured: true;
      uniques: number;
      pageViews: number;
      minute: string | null;
      basis: "minute" | "visits";
      fetchedAt: string;
    };

type MetricRow = {
  dimensions?: { date?: string; datetime?: string; datetimeMinute?: string };
  sum?: { requests?: number; pageViews?: number };
  uniq?: { uniques?: number };
};

type TopPageRow = {
  count?: number;
  dimensions?: { path?: string | null };
};

type ZoneReport = {
  series?: MetricRow[];
  totals?: MetricRow[];
  previous?: MetricRow[];
  topPages?: TopPageRow[];
};

type CacheEntry = { expiresAt: number; value: unknown };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function isConfigured() {
  return Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID);
}

function configuredHostname() {
  const hostname = env.CLOUDFLARE_HOSTNAME.trim();
  return hostname || null;
}

function utcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hourKey(value: string | Date) {
  return new Date(value).toISOString().slice(0, 13);
}

function changePct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function rangeWindow(range: VisitorRange, now = new Date()) {
  const todayStart = utcDayStart(now);
  if (range === "today") {
    const end = new Date(now);
    end.setUTCMinutes(0, 0, 0);
    end.setUTCHours(end.getUTCHours() + 1);
    return {
      start: todayStart,
      end,
      prevStart: addUtcDays(todayStart, -1),
      prevEnd: addUtcDays(end, -1),
      granularity: "hour" as const,
    };
  }

  const days = range === "7d" ? 7 : 30;
  const end = addUtcDays(todayStart, 1);
  const start = addUtcDays(end, -days);
  return {
    start,
    end,
    prevStart: addUtcDays(start, -days),
    prevEnd: start,
    granularity: "day" as const,
  };
}

async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = load()
    .then((value) => {
      cache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloudflare analytics request failed";
    throw new AppError(message, 502, "CLOUDFLARE_ANALYTICS_ERROR");
  }

  const body = (await response.json()) as { data?: T; errors?: { message?: string }[] };
  if (!response.ok || body.errors?.length) {
    const message = body.errors?.[0]?.message || `Cloudflare analytics request failed (${response.status})`;
    throw new AppError(message, 502, "CLOUDFLARE_ANALYTICS_ERROR");
  }
  if (!body.data) {
    throw new AppError("Cloudflare analytics returned no data", 502, "CLOUDFLARE_ANALYTICS_ERROR");
  }
  return body.data;
}

function zoneOrThrow<T>(zones: T[] | undefined): T {
  const zone = zones?.[0];
  if (!zone) {
    throw new AppError(
      "Cloudflare zone was not found. Check CLOUDFLARE_ZONE_ID.",
      502,
      "CLOUDFLARE_ANALYTICS_ERROR",
    );
  }
  return zone;
}

function readTotals(groups: MetricRow[]) {
  const pageViews = groups.reduce((sum, group) => sum + (group.sum?.pageViews ?? 0), 0);
  const requests = groups.reduce((sum, group) => sum + (group.sum?.requests ?? 0), 0);
  const uniques =
    groups.length === 1
      ? (groups[0]?.uniq?.uniques ?? 0)
      : groups.reduce((sum, group) => sum + (group.uniq?.uniques ?? 0), 0);
  return { uniques, pageViews, requests };
}

function fillHours(start: Date, end: Date, rows: MetricRow[]): VisitorPoint[] {
  const byHour = new Map<string, MetricRow>();
  for (const row of rows) {
    const raw = row.dimensions?.datetime;
    if (!raw) continue;
    byHour.set(hourKey(raw), row);
  }

  const points: VisitorPoint[] = [];
  for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 3_600_000)) {
    const row = byHour.get(hourKey(cursor));
    points.push({
      at: cursor.toISOString(),
      uniques: row?.uniq?.uniques ?? 0,
      pageViews: row?.sum?.pageViews ?? 0,
      requests: row?.sum?.requests ?? 0,
    });
  }
  return points;
}

function fillDays(start: Date, end: Date, rows: MetricRow[]): VisitorPoint[] {
  const byDay = new Map<string, MetricRow>();
  for (const row of rows) {
    const date = row.dimensions?.date;
    if (date) byDay.set(date.slice(0, 10), row);
  }

  const points: VisitorPoint[] = [];
  for (let cursor = new Date(start); cursor < end; cursor = addUtcDays(cursor, 1)) {
    const key = isoDate(cursor);
    const row = byDay.get(key);
    points.push({
      at: key,
      uniques: row?.uniq?.uniques ?? 0,
      pageViews: row?.sum?.pageViews ?? 0,
      requests: row?.sum?.requests ?? 0,
    });
  }
  return points;
}

const ASSET_PATH = /(?:^|\/)_next\/|\.[a-z0-9]{2,8}$/i;

function isPagePath(path: string) {
  if (!path.startsWith("/") || path.includes("..") || ASSET_PATH.test(path)) return false;
  if (path.startsWith("/cdn-cgi/") || path.startsWith("/api/") || path.startsWith("/debug/")) return false;
  const segments = path.split("/").filter(Boolean);
  return segments.every((segment) => !segment.startsWith(".") && !segment.includes("."));
}

function topPages(rows: TopPageRow[]) {
  return rows
    .map((row) => ({
      path: row.dimensions?.path ?? "",
      requests: row.count ?? 0,
    }))
    .filter((row) => isPagePath(row.path))
    .slice(0, 8);
}

function reportQuery(granularity: "hour" | "day", hostname: string | null) {
  const seriesNode =
    granularity === "hour"
      ? `series: httpRequests1hGroups(
          limit: 48
          filter: { datetime_geq: $start, datetime_lt: $end }
          orderBy: [datetime_ASC]
        ) {
          dimensions { datetime }
          sum { requests pageViews }
          uniq { uniques }
        }
        totals: httpRequests1hGroups(
          limit: 1000
          filter: { datetime_geq: $start, datetime_lt: $end }
        ) {
          sum { requests pageViews }
          uniq { uniques }
        }
        previous: httpRequests1hGroups(
          limit: 1000
          filter: { datetime_geq: $prevStart, datetime_lt: $prevEnd }
        ) {
          sum { requests pageViews }
          uniq { uniques }
        }`
      : `series: httpRequests1dGroups(
          limit: 62
          filter: { date_geq: $start, date_lt: $end }
          orderBy: [date_ASC]
        ) {
          dimensions { date }
          sum { requests pageViews }
          uniq { uniques }
        }
        totals: httpRequests1dGroups(
          limit: 1000
          filter: { date_geq: $start, date_lt: $end }
        ) {
          sum { requests pageViews }
          uniq { uniques }
        }
        previous: httpRequests1dGroups(
          limit: 1000
          filter: { date_geq: $prevStart, date_lt: $prevEnd }
        ) {
          sum { requests pageViews }
          uniq { uniques }
        }`;

  const hostFilter = hostname ? "clientRequestHTTPHost: $hostname" : "";

  return `query VisitorReport(
    $zoneTag: string
    $start: ${granularity === "hour" ? "Time" : "Date"}
    $end: ${granularity === "hour" ? "Time" : "Date"}
    $prevStart: ${granularity === "hour" ? "Time" : "Date"}
    $prevEnd: ${granularity === "hour" ? "Time" : "Date"}
    $adaptiveStart: Time
    $adaptiveEnd: Time
    ${hostname ? "$hostname: string" : ""}
  ) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        ${seriesNode}
        topPages: httpRequestsAdaptiveGroups(
          limit: 40
          orderBy: [count_DESC]
          filter: {
            datetime_geq: $adaptiveStart
            datetime_lt: $adaptiveEnd
            requestSource: "eyeball"
            clientRequestHTTPMethodName: "GET"
            ${hostFilter}
          }
        ) {
          count
          dimensions { path: clientRequestPath }
        }
      }
    }
  }`;
}

async function loadReport(range: VisitorRange): Promise<VisitorReport> {
  const hostname = configuredHostname();
  const window = rangeWindow(range);
  const timeStart = window.granularity === "hour" ? window.start.toISOString() : isoDate(window.start);
  const timeEnd = window.granularity === "hour" ? window.end.toISOString() : isoDate(window.end);
  const prevStart = window.granularity === "hour" ? window.prevStart.toISOString() : isoDate(window.prevStart);
  const prevEnd = window.granularity === "hour" ? window.prevEnd.toISOString() : isoDate(window.prevEnd);

  const variables: Record<string, unknown> = {
    zoneTag: env.CLOUDFLARE_ZONE_ID,
    start: timeStart,
    end: timeEnd,
    prevStart,
    prevEnd,
    adaptiveStart: window.start.toISOString(),
    adaptiveEnd: window.end.toISOString(),
  };
  if (hostname) variables.hostname = hostname;

  const data = await graphql<{ viewer: { zones: ZoneReport[] } }>(
    reportQuery(window.granularity, hostname),
    variables,
  );
  const zone = zoneOrThrow(data.viewer.zones);
  const series =
    window.granularity === "hour"
      ? fillHours(window.start, window.end, zone.series ?? [])
      : fillDays(window.start, window.end, zone.series ?? []);
  const current = readTotals(zone.totals ?? []);
  const previous = readTotals(zone.previous ?? []);
  const pageViews = series.reduce((sum, point) => sum + point.pageViews, 0);
  const requests = series.reduce((sum, point) => sum + point.requests, 0);
  const uniques = (zone.totals ?? []).length === 1 ? current.uniques : series.reduce((sum, point) => sum + point.uniques, 0);

  return {
    configured: true,
    range,
    uniques: { value: uniques, changePct: changePct(uniques, previous.uniques) },
    pageViews: { value: pageViews, changePct: changePct(pageViews, previous.pageViews) },
    requests: { value: requests, changePct: changePct(requests, previous.requests) },
    series,
    topPages: topPages(zone.topPages ?? []),
    hostname,
    fetchedAt: new Date().toISOString(),
  };
}

function liveQuery(dimension: "datetimeMinute" | "datetime") {
  const orderBy = dimension === "datetimeMinute" ? "datetimeMinute_DESC" : "datetime_DESC";
  return `query LiveVisitors($zoneTag: string, $start: Time, $end: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1mGroups(
          limit: 15
          filter: { datetime_geq: $start, datetime_lt: $end }
          orderBy: [${orderBy}]
        ) {
          dimensions { ${dimension} }
          sum { pageViews }
          uniq { uniques }
        }
      }
    }
  }`;
}

function planLimitsLiveMinutes(error: unknown) {
  return error instanceof AppError && /does not have access|not available/i.test(error.message);
}

async function loadLiveMinutes(now: Date, dimension: "datetimeMinute" | "datetime" = "datetimeMinute"): Promise<LiveVisitors> {
  const start = new Date(now.getTime() - 15 * 60 * 1000);
  const data = await graphql<{
    viewer: { zones: { httpRequests1mGroups?: MetricRow[] }[] };
  }>(liveQuery(dimension), {
    zoneTag: env.CLOUDFLARE_ZONE_ID,
    start: start.toISOString(),
    end: now.toISOString(),
  });

  const zone = zoneOrThrow(data.viewer.zones);
  const rows = zone.httpRequests1mGroups ?? [];
  const cutoff = now.getTime() - 60_000;
  const completed = rows.find((row) => {
    const minute = row.dimensions?.datetimeMinute ?? row.dimensions?.datetime;
    return minute ? new Date(minute).getTime() <= cutoff : false;
  });
  const chosen = completed ?? rows[0];
  const minute = chosen?.dimensions?.datetimeMinute ?? chosen?.dimensions?.datetime ?? null;

  return {
    configured: true,
    uniques: chosen?.uniq?.uniques ?? 0,
    pageViews: chosen?.sum?.pageViews ?? 0,
    minute,
    basis: "minute",
    fetchedAt: new Date().toISOString(),
  };
}

async function loadLiveAdaptive(now: Date): Promise<LiveVisitors> {
  const start = new Date(now.getTime() - 5 * 60 * 1000);
  const hostname = configuredHostname();
  const hostFilter = hostname ? "clientRequestHTTPHost: $hostname" : "";
  const data = await graphql<{
    viewer: { zones: { live?: { count?: number; sum?: { visits?: number } }[] }[] };
  }>(
    `query LiveVisits($zoneTag: string, $start: Time, $end: Time${hostname ? ", $hostname: string" : ""}) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          live: httpRequestsAdaptiveGroups(
            limit: 1
            filter: {
              datetime_geq: $start
              datetime_lt: $end
              requestSource: "eyeball"
              ${hostFilter}
            }
          ) {
            count
            sum { visits }
          }
        }
      }
    }`,
    {
      zoneTag: env.CLOUDFLARE_ZONE_ID,
      start: start.toISOString(),
      end: now.toISOString(),
      ...(hostname ? { hostname } : {}),
    },
  );

  const row = zoneOrThrow(data.viewer.zones).live?.[0];
  return {
    configured: true,
    uniques: row?.sum?.visits ?? 0,
    pageViews: row?.count ?? 0,
    minute: start.toISOString(),
    basis: "visits",
    fetchedAt: new Date().toISOString(),
  };
}

async function loadLive(): Promise<LiveVisitors> {
  const now = new Date();
  try {
    return await loadLiveMinutes(now);
  } catch (error) {
    if (error instanceof AppError && /datetimeMinute/i.test(error.message)) {
      try {
        return await loadLiveMinutes(now, "datetime");
      } catch (retryError) {
        if (planLimitsLiveMinutes(retryError)) return loadLiveAdaptive(now);
        throw retryError;
      }
    }
    if (planLimitsLiveMinutes(error)) return loadLiveAdaptive(now);
    throw error;
  }
}

export const cloudflareAnalytics = {
  async getReport(range: VisitorRange): Promise<VisitorReport> {
    if (!isConfigured()) return { configured: false };
    const hostname = configuredHostname() ?? "zone";
    return cached(`visitors:${range}:${hostname}`, RANGE_TTL_MS, () => loadReport(range));
  },

  async getLive(): Promise<LiveVisitors> {
    if (!isConfigured()) return { configured: false };
    const hostname = configuredHostname() ?? "zone";
    return cached(`visitors:live:${hostname}`, LIVE_TTL_MS, () => loadLive());
  },
};
