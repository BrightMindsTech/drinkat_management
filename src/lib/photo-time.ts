import { addDays, parse } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

export function photoPeriodKey(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

/** Instant for an HH:MM wall clock in the operational timezone (Asia/Amman by default). */
export function photoInstantInZone(periodKey: string, hm: string, timeZone = DEFAULT_APP_TIMEZONE): Date {
  const [hRaw, mRaw] = hm.split(':');
  const h = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const m = Math.min(59, Math.max(0, Number(mRaw) || 0));
  const s = `${periodKey} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  return fromZonedTime(parse(s, 'yyyy-MM-dd HH:mm:ss', new Date(0)), timeZone);
}

export function parsePhotoDaysOfWeek(raw: string): number[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v) || v.length === 0) return [];
    return v.map((n) => Number(n)).filter((n) => n >= 0 && n <= 6);
  } catch {
    return [];
  }
}

export function shiftPhotoPeriodKey(
  periodKey: string,
  days: number,
  timeZone = DEFAULT_APP_TIMEZONE
): string {
  const noon = photoInstantInZone(periodKey, '12:00', timeZone);
  return formatInTimeZone(addDays(noon, days), timeZone, 'yyyy-MM-dd');
}

export function photoWeekday(periodKey: string, timeZone = DEFAULT_APP_TIMEZONE): number {
  const iso = Number(formatInTimeZone(photoInstantInZone(periodKey, '12:00', timeZone), timeZone, 'i'));
  return iso === 7 ? 0 : iso;
}

function hmMinutes(hm: string): number {
  const [hRaw, mRaw] = hm.split(':');
  const h = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const m = Math.min(59, Math.max(0, Number(mRaw) || 0));
  return h * 60 + m;
}

/** Night 20:00–02:00 and any due clock that is not after start on the same day. */
export function photoDueCrossesMidnight(startTime: string, dueTime: string): boolean {
  return hmMinutes(dueTime) <= hmMinutes(startTime);
}

export function photoWindowInstants(
  periodKey: string,
  startTime: string,
  dueTime: string,
  timeZone = DEFAULT_APP_TIMEZONE
): { windowStartAt: Date; dueAt: Date } {
  const windowStartAt = photoInstantInZone(periodKey, startTime, timeZone);
  const dueKey = photoDueCrossesMidnight(startTime, dueTime)
    ? shiftPhotoPeriodKey(periodKey, 1, timeZone)
    : periodKey;
  return { windowStartAt, dueAt: photoInstantInZone(dueKey, dueTime, timeZone) };
}

/** True only while the official window is open (inclusive of start and due). */
export function isPhotoWindowOpenNow(
  task: { windowStartAt: Date | string; dueAt: Date | string },
  now = new Date()
): boolean {
  const start = new Date(task.windowStartAt).getTime();
  const due = new Date(task.dueAt).getTime();
  const t = now.getTime();
  return Number.isFinite(start) && Number.isFinite(due) && start <= t && t <= due;
}
