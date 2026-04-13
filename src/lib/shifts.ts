import { parse, addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { ShiftDefinition } from '@prisma/client';

export const DEFAULT_APP_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Amman';

/** Minutes from midnight in APP_TIMEZONE (0–1439). */
export function localMinutesFromDate(d: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

function utcAtLocalWallTime(dayBase: Date, timeZone: string, minuteOfDay: number): Date {
  const dayStr = formatInTimeZone(dayBase, timeZone, 'yyyy-MM-dd');
  const h = Math.floor(minuteOfDay / 60);
  const mi = minuteOfDay % 60;
  const s = `${dayStr} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00`;
  const naive = parse(s, 'yyyy-MM-dd HH:mm:ss', new Date(0));
  return fromZonedTime(naive, timeZone);
}

function addCalendarDaysInTz(ymd: string, delta: number, tz: string): string {
  const noonLocal = fromZonedTime(parse(`${ymd} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz);
  const moved = addDays(noonLocal, delta);
  return formatInTimeZone(moved, tz, 'yyyy-MM-dd');
}

/** Inclusive start and exclusive end of the local calendar day in `timeZone`, as UTC instants. */
export function localCalendarDayBoundsUtc(now: Date, timeZone: string): { dayStartUtc: Date; nextDayStartUtc: Date } {
  const ymd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  const dayStartUtc = fromZonedTime(parse(`${ymd} 00:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), timeZone);
  const nextYmd = addCalendarDaysInTz(ymd, 1, timeZone);
  const nextDayStartUtc = fromZonedTime(parse(`${nextYmd} 00:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), timeZone);
  return { dayStartUtc, nextDayStartUtc };
}

/** ISO weekday in tz: 1 = Mon … 7 = Sun */
function isoWeekdayInTz(ymd: string, tz: string): number {
  const inst = fromZonedTime(parse(`${ymd} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz);
  return parseInt(formatInTimeZone(inst, tz, 'i'), 10);
}

const NIGHT_START = 17 * 60;
const NIGHT_END = 2 * 60;
const NIGHT_FRI_START = 17 * 60 + 30;
const NIGHT_FRI_END = 2 * 60 + 30;

/**
 * Airport night segments: Mon–Thu & Sat–Sun 17:00→next day 02:00;
 * Friday 17:30→Saturday 02:30 (replaces the usual Fri 17:00 segment that day).
 */
function buildAirportNightSegmentsAround(now: Date, tz: string): { start: Date; end: Date }[] {
  const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const out: { start: Date; end: Date }[] = [];

  for (let d = -2; d <= 2; d++) {
    const anchorStr = addCalendarDaysInTz(todayStr, d, tz);
    const isoD = isoWeekdayInTz(anchorStr, tz);
    const nextStr = addCalendarDaysInTz(anchorStr, 1, tz);

    if (isoD === 5) {
      const start = utcAtLocalWallTime(
        fromZonedTime(parse(`${anchorStr} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz),
        tz,
        NIGHT_FRI_START
      );
      const end = utcAtLocalWallTime(
        fromZonedTime(parse(`${nextStr} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz),
        tz,
        NIGHT_FRI_END
      );
      out.push({ start, end });
    } else {
      const start = utcAtLocalWallTime(
        fromZonedTime(parse(`${anchorStr} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz),
        tz,
        NIGHT_START
      );
      const end = utcAtLocalWallTime(
        fromZonedTime(parse(`${nextStr} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz),
        tz,
        NIGHT_END
      );
      out.push({ start, end });
    }
  }

  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

function minutesUntilAirportNightShiftEnd(now: Date, tz: string): number {
  const segs = buildAirportNightSegmentsAround(now, tz);
  for (const { start, end } of segs) {
    if (now.getTime() >= start.getTime() && now.getTime() < end.getTime()) {
      return (end.getTime() - now.getTime()) / 60000;
    }
  }

  let lastEndBefore: Date | null = null;
  let nextEndAfter: Date | null = null;
  for (const { end } of segs) {
    if (end.getTime() <= now.getTime() && (!lastEndBefore || end.getTime() > lastEndBefore.getTime())) {
      lastEndBefore = end;
    }
    if (end.getTime() > now.getTime() && (!nextEndAfter || end.getTime() < nextEndAfter.getTime())) {
      nextEndAfter = end;
    }
  }

  if (lastEndBefore) {
    const minsSince = (now.getTime() - lastEndBefore.getTime()) / 60000;
    if (minsSince <= 30) {
      return (lastEndBefore.getTime() - now.getTime()) / 60000;
    }
  }

  if (nextEndAfter) {
    return (nextEndAfter.getTime() - now.getTime()) / 60000;
  }

  return 99999;
}

/** Standard night (DB): 17:00 → next calendar day 02:00 */
function minutesUntilStandardNightShiftEnd(now: Date, shift: ShiftDefinition, tz: string): number {
  const L = localMinutesFromDate(now, tz);
  const S = shift.startMinute;
  const E = shift.endMinute;
  const todayStr = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const tomorrowBase = addDays(parse(todayStr, 'yyyy-MM-dd', new Date(0)), 1);

  if (L >= S) {
    const endNext = utcAtLocalWallTime(tomorrowBase, tz, E);
    return (endNext.getTime() - now.getTime()) / 60000;
  }
  if (L < E) {
    const endToday = utcAtLocalWallTime(now, tz, E);
    return (endToday.getTime() - now.getTime()) / 60000;
  }

  const endToday = utcAtLocalWallTime(now, tz, E);
  if (endToday.getTime() > now.getTime()) {
    return (endToday.getTime() - now.getTime()) / 60000;
  }
  const endNext = utcAtLocalWallTime(tomorrowBase, tz, E);
  return (endNext.getTime() - now.getTime()) / 60000;
}

export type BranchShiftContext = { shiftProfile?: string | null };

/**
 * Minutes until current shift end (negative = that many minutes past end).
 * Morning: 7:30–17:00 (from ShiftDefinition, DB).
 * Night + airport: Fri exception 17:30–02:30; else 17:00–02:00.
 * Night + other branches: 17:00–02:00 from ShiftDefinition.
 */
export function minutesUntilShiftEnd(
  now: Date,
  shift: ShiftDefinition,
  timeZone: string,
  branch?: BranchShiftContext
): number {
  if (!shift.crossesMidnight) {
    const endToday = utcAtLocalWallTime(now, timeZone, shift.endMinute);
    return (endToday.getTime() - now.getTime()) / 60000;
  }

  if (shift.key === 'night' && branch?.shiftProfile === 'airport') {
    return minutesUntilAirportNightShiftEnd(now, timeZone);
  }

  return minutesUntilStandardNightShiftEnd(now, shift, timeZone);
}

export function isShiftEndedOrWithin30Min(
  now: Date,
  shift: ShiftDefinition,
  timeZone: string,
  branch?: BranchShiftContext
): boolean {
  return minutesUntilShiftEnd(now, shift, timeZone, branch) <= 30;
}
