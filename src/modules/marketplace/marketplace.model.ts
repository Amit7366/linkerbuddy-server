import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma.js";
import type {
  CreateListingInput,
  ListListingsQuery,
  UpdateListingInput,
} from "./marketplace.validation.js";
import type { MarketplaceListingResponse } from "./marketplace.types.js";
import {
  columnsToPrices,
  pricesToColumns,
  type ListingPriceColumns,
} from "./listing-prices.js";

type ListingRow = ListingPriceColumns & {
  id: number;
  domain: string;
  niche: string;
  da: number;
  dr: number;
  traffic: number;
  trafficSources: string[];
  country: string;
  dofollow: boolean;
  maxDofollow: number;
  tat: string;
  samplePostUrls: string[];
  note: string;
  owner: string;
  trend: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeSampleUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const NEWEST_BADGE_LIMIT = 5;

async function newestListingIds() {
  const rows = await prisma.marketplaceListing.findMany({
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: NEWEST_BADGE_LIMIT,
  });
  return new Set(rows.map((row) => row.id));
}

function toResponse(row: ListingRow, newestIds?: Set<number>): MarketplaceListingResponse {
  return {
    id: row.id,
    domain: row.domain,
    niche: row.niche,
    da: row.da,
    dr: row.dr,
    traffic: row.traffic,
    trafficSources: row.trafficSources,
    country: row.country,
    dofollow: row.dofollow,
    maxDofollow: row.maxDofollow,
    prices: columnsToPrices(row),
    tat: row.tat,
    samplePostUrls: row.samplePostUrls,
    note: row.note,
    owner: row.owner as "Admin" | "Partner",
    trend: row.trend as "Rising" | "Stable",
    isNew: newestIds?.has(row.id) ?? false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseDrRange(value: string): { gte?: number; lte?: number } | null {
  const trimmed = value.trim();
  const range = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
  if (range) {
    return { gte: Number(range[1]), lte: Number(range[2]) };
  }
  if (/^\d+$/.test(trimmed)) {
    return { gte: Number(trimmed) };
  }
  return null;
}

function applyFilterKey(
  key: string,
  and: Prisma.MarketplaceListingWhereInput[],
) {
  switch (key) {
    case "budget":
      and.push({ guestPostRegular: { lte: 50 } });
      break;
    case "authority":
      and.push({ dr: { gte: 40, lte: 60 } });
      break;
    case "traffic":
      and.push({ traffic: { gte: 10000 } });
      break;
    case "India":
      and.push({ country: { equals: "India", mode: "insensitive" } });
      break;
    case "General":
      and.push({ niche: { equals: "General", mode: "insensitive" } });
      break;
    case "highDa":
      and.push({ da: { gte: 50 } });
      break;
    default:
      break;
  }
}

function buildWhere(query: ListListingsQuery): Prisma.MarketplaceListingWhereInput {
  const where: Prisma.MarketplaceListingWhereInput = {};
  const and: Prisma.MarketplaceListingWhereInput[] = [];

  if (query.ids) {
    const ids = query.ids
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0) {
      and.push({ id: { in: ids } });
    }
  }

  if (query.q?.trim()) {
    const q = query.q.trim();
    and.push({
      OR: [
        { domain: { contains: q, mode: "insensitive" } },
        { niche: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const filterKeys = new Set<string>();
  if (query.filters?.trim()) {
    for (const part of query.filters.split(",")) {
      const key = part.trim();
      if (key && key !== "all") filterKeys.add(key);
    }
  }
  if (query.filter && query.filter !== "all") {
    filterKeys.add(query.filter);
  }
  for (const key of filterKeys) {
    applyFilterKey(key, and);
  }

  if (query.country?.trim()) {
    and.push({
      country: { equals: query.country.trim(), mode: "insensitive" },
    });
  }

  if (query.niche?.trim()) {
    and.push({
      niche: { equals: query.niche.trim(), mode: "insensitive" },
    });
  }

  if (query.priceMax !== undefined) {
    and.push({ guestPostRegular: { lte: query.priceMax } });
  }

  if (query.priceMin !== undefined) {
    and.push({ guestPostRegular: { gte: query.priceMin } });
  }

  const trafficFilter: { gte?: number; lte?: number } = {};
  if (query.trafficMin !== undefined) trafficFilter.gte = query.trafficMin;
  if (query.trafficMax !== undefined) trafficFilter.lte = query.trafficMax;
  if (trafficFilter.gte !== undefined || trafficFilter.lte !== undefined) {
    and.push({ traffic: trafficFilter });
  }

  const daFilter: { gte?: number; lte?: number } = {};
  if (query.daMin !== undefined) daFilter.gte = query.daMin;
  if (query.daMax !== undefined) daFilter.lte = query.daMax;
  if (daFilter.gte !== undefined || daFilter.lte !== undefined) {
    and.push({ da: daFilter });
  }

  if (query.dr?.trim()) {
    const range = parseDrRange(query.dr);
    if (range) {
      and.push({ dr: range });
    }
  }

  if (and.length > 0) where.AND = and;
  return where;
}

function buildOrderBy(
  sort: ListListingsQuery["sort"],
): Prisma.MarketplaceListingOrderByWithRelationInput[] {
  switch (sort) {
    case "price":
      return [{ guestPostRegular: "asc" }, { id: "asc" }];
    case "traffic":
      return [{ traffic: "desc" }, { id: "asc" }];
    case "dr":
      return [{ dr: "desc" }, { id: "asc" }];
    case "da":
      return [{ da: "desc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ traffic: "desc" }, { id: "asc" }];
  }
}

export const marketplaceModel = {
  async findMany(query: ListListingsQuery) {
    const where = buildWhere(query);
    const skip = (query.page - 1) * query.limit;
    const sort = query.sort ?? "recommended";

    const [rows, total, newestIds] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: buildOrderBy(sort),
      }),
      prisma.marketplaceListing.count({ where }),
      newestListingIds(),
    ]);

    return {
      listings: rows.map((row) => toResponse(row, newestIds)),
      total,
      page: query.page,
      limit: query.limit,
    };
  },

  async getStats() {
    const [total, countryGroups, dofollowAgg] = await Promise.all([
      prisma.marketplaceListing.count(),
      prisma.marketplaceListing.groupBy({
        by: ["country"],
        _count: { _all: true },
      }),
      prisma.marketplaceListing.aggregate({
        _max: { maxDofollow: true },
      }),
    ]);

    return {
      total,
      countries: countryGroups.length,
      maxDofollow: dofollowAgg._max.maxDofollow ?? 0,
    };
  },

  async getFacets() {
    const [countries, niches] = await Promise.all([
      prisma.marketplaceListing.groupBy({
        by: ["country"],
        _count: { _all: true },
        orderBy: { country: "asc" },
      }),
      prisma.marketplaceListing.groupBy({
        by: ["niche"],
        _count: { _all: true },
        orderBy: { niche: "asc" },
      }),
    ]);

    return {
      countries: countries.map((row) => row.country),
      niches: niches.map((row) => row.niche),
    };
  },

  async findById(id: number) {
    const [row, newestIds] = await Promise.all([
      prisma.marketplaceListing.findUnique({ where: { id } }),
      newestListingIds(),
    ]);
    return row ? toResponse(row, newestIds) : null;
  },

  async findByDomain(domain: string) {
    return prisma.marketplaceListing.findUnique({ where: { domain } });
  },

  async create(data: CreateListingInput) {
    const row = await prisma.marketplaceListing.create({
      data: {
        domain: data.domain.toLowerCase(),
        niche: data.niche,
        da: data.da,
        dr: data.dr,
        traffic: data.traffic,
        trafficSources: data.trafficSources,
        country: data.country,
        dofollow: data.dofollow,
        maxDofollow: data.maxDofollow,
        tat: data.tat,
        samplePostUrls: data.samplePostUrls.map(normalizeSampleUrl),
        note: data.note,
        owner: data.owner,
        trend: data.trend,
        ...pricesToColumns(data.prices),
      },
    });
    const newestIds = await newestListingIds();
    return toResponse(row, newestIds);
  },

  async update(id: number, data: UpdateListingInput) {
    const { prices, domain, samplePostUrls, ...rest } = data;
    const row = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...rest,
        ...(domain ? { domain: domain.toLowerCase() } : {}),
        ...(samplePostUrls
          ? { samplePostUrls: samplePostUrls.map(normalizeSampleUrl) }
          : {}),
        ...(prices ? pricesToColumns(prices) : {}),
      },
    });
    const newestIds = await newestListingIds();
    return toResponse(row, newestIds);
  },

  async delete(id: number) {
    await prisma.marketplaceListing.delete({ where: { id } });
  },
};
