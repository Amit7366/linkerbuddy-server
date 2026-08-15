import type { AvailabilityBlock, AvailabilityRule, ScheduledCall } from "@prisma/client";
import {
  BOOKING_WINDOW_DAYS,
  CALL_BUFFER_MIN,
  CALL_DURATION_MIN,
  MIN_NOTICE_HOURS,
  STAFF_TIMEZONE,
} from "./calls.constants.js";
import {
  addMinutes,
  jsWeekdayForDateKey,
  parseDateKey,
  parseHm,
  zonedDateToUtc,
} from "@/lib/timezone.js";

const DEFAULT_RULES: Array<Pick<AvailabilityRule, "dayOfWeek" | "startTime" | "endTime" | "timezone">> = [
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", timezone: STAFF_TIMEZONE },
  { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", timezone: STAFF_TIMEZONE },
  { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", timezone: STAFF_TIMEZONE },
  { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", timezone: STAFF_TIMEZONE },
  { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", timezone: STAFF_TIMEZONE },
];

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function generateSlots(input: {
  dateKey: string;
  visitorTz: string;
  durationMin?: number;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  booked: ScheduledCall[];
  now?: Date;
}) {
  const duration = input.durationMin ?? CALL_DURATION_MIN;
  const parsed = parseDateKey(input.dateKey);
  if (!parsed) return [];

  const now = input.now ?? new Date();
  const minStart = addMinutes(now, MIN_NOTICE_HOURS * 60);
  const windowEnd = addMinutes(now, BOOKING_WINDOW_DAYS * 24 * 60);
  const dayStart = zonedDateToUtc(parsed.year, parsed.month, parsed.day, 0, 0, STAFF_TIMEZONE);
  if (dayStart > windowEnd) return [];

  const rules = input.rules.length > 0 ? input.rules : DEFAULT_RULES;
  const weekday = jsWeekdayForDateKey(input.dateKey, STAFF_TIMEZONE);
  const rule = rules.find((item) => item.dayOfWeek === weekday);
  if (!rule) return [];

  const startHm = parseHm(rule.startTime);
  const endHm = parseHm(rule.endTime);
  const dayOpen = zonedDateToUtc(
    parsed.year,
    parsed.month,
    parsed.day,
    startHm.hour,
    startHm.minute,
    rule.timezone || STAFF_TIMEZONE,
  );
  const dayClose = zonedDateToUtc(
    parsed.year,
    parsed.month,
    parsed.day,
    endHm.hour,
    endHm.minute,
    rule.timezone || STAFF_TIMEZONE,
  );

  const slots: Array<{ start: string; end: string }> = [];
  for (let cursor = dayOpen; addMinutes(cursor, duration) <= dayClose; cursor = addMinutes(cursor, duration)) {
    const start = cursor;
    const end = addMinutes(start, duration);
    const occupiedEnd = addMinutes(end, CALL_BUFFER_MIN);

    if (start < minStart) continue;

    const blocked = input.blocks.some((block) => overlaps(start, occupiedEnd, block.startsAt, block.endsAt));
    if (blocked) continue;

    const taken = input.booked.some((call) =>
      overlaps(start, occupiedEnd, call.startsAt, addMinutes(call.endsAt, CALL_BUFFER_MIN)),
    );
    if (taken) continue;

    slots.push({ start: start.toISOString(), end: end.toISOString() });
  }

  return slots;
}
