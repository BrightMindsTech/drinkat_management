import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

export const PHOTO_CHECK_STATUSES = ['pending_qc', 'approved', 'rejected', 'ai_rejected'] as const;
export type PhotoCheckStatus = (typeof PHOTO_CHECK_STATUSES)[number];

export const PHOTO_AI_VERDICTS = ['pass', 'fail', 'pending', 'unavailable'] as const;
export type PhotoAiVerdict = (typeof PHOTO_AI_VERDICTS)[number];

/** Counts toward submission/consistency. AI rejects are retakes and do not boost KPI. */
export function photoCountsTowardKpi(status: string): boolean {
  return status === 'pending_qc' || status === 'approved' || status === 'rejected';
}

export function daysElapsedInPeriod(
  periodKey: string,
  now = new Date(),
  timeZone = DEFAULT_APP_TIMEZONE
): number {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) return 1;
  const currentKey = formatInTimeZone(now, timeZone, 'yyyy-MM');
  if (currentKey < periodKey) return 1;
  if (currentKey > periodKey) {
    const [year, month] = periodKey.split('-').map(Number);
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }
  return Math.max(1, Number(formatInTimeZone(now, timeZone, 'd')));
}

export function uniqueLocalDays(
  dates: Date[],
  timeZone = DEFAULT_APP_TIMEZONE
): number {
  return new Set(dates.map((d) => formatInTimeZone(d, timeZone, 'yyyy-MM-dd'))).size;
}
