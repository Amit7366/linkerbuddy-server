const DEFAULT_TZ = "Asia/Dhaka";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { hour: h ?? 0, minute: m ?? 0 };
}

export function zonedParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
export function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = zonedParts(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function dateKeyInZone(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function formatInZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(date);
}

export function jsWeekdayInZone(date: Date, timeZone: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function jsWeekdayForDateKey(dateKey: string, timeZone = DEFAULT_TZ) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return 0;
  const noon = zonedDateToUtc(parsed.year, parsed.month, parsed.day, 12, 0, timeZone);
  return jsWeekdayInZone(noon, timeZone);
}

export { DEFAULT_TZ };
