import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

/**
 * Owner-confirmed 360° Branch Cleanliness windows. Times are local Asia/Amman.
 * 360° is several photographs of different branch corners in one submission, not a panorama.
 *
 * Each slot stays open until 30 minutes before the next slot starts
 * (morning → midday, midday → night, night → next morning).
 */
export const PHOTO_OFFICIAL_TIMEZONE = DEFAULT_APP_TIMEZONE;

export const PHOTO_WINDOW_HANDOFF_MINUTES = 30;

const PHOTO_WINDOW_STARTS = [
  { slotKey: 'morning', slotLabelEn: 'Morning', slotLabelAr: 'صباح', startTime: '08:00' },
  { slotKey: 'midday', slotLabelEn: 'Midday', slotLabelAr: 'ظهر', startTime: '14:00' },
  { slotKey: 'night', slotLabelEn: 'Night', slotLabelAr: 'ليل', startTime: '20:00' },
] as const;

function hmToMinutes(hm: string): number {
  const [hRaw, mRaw] = hm.split(':');
  return (Number(hRaw) || 0) * 60 + (Number(mRaw) || 0);
}

export function minutesBeforeClock(hm: string, minutes: number): string {
  let total = hmToMinutes(hm) - minutes;
  if (total < 0) total += 24 * 60;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const PHOTO_360_OFFICIAL_WINDOWS = PHOTO_WINDOW_STARTS.map((slot, i) => {
  const next = PHOTO_WINDOW_STARTS[(i + 1) % PHOTO_WINDOW_STARTS.length];
  return {
    ...slot,
    dueTime: minutesBeforeClock(next.startTime, PHOTO_WINDOW_HANDOFF_MINUTES),
  };
});

/** Bump when official start/due clocks change so cron rewrites D1 schedules once. */
export const PHOTO_PROGRAM_STAMP = 'photo_official_program:v2-handoff-30';

/** photoWeekday: 0 Sun … 6 Sat (Asia/Amman). */
export const PHOTO_SATURDAY_WEEKDAY = 6;
export const PHOTO_DAILY_DAYS_JSON = '[0,1,2,3,4,5,6]';
export const PHOTO_SATURDAY_DAYS_JSON = '[6]';

/** Weekly deep-clean photos — Saturday only, not every day. */
export const PHOTO_SATURDAY_ONLY_CODES = [
  'slush_machine_cleaning',
  'fryer_cleanliness',
  'grill_cleanliness',
  'preparation_refrigerator',
] as const;

export function photoScheduleDaysJson(typeCode: string): string {
  return (PHOTO_SATURDAY_ONLY_CODES as readonly string[]).includes(typeCode)
    ? PHOTO_SATURDAY_DAYS_JSON
    : PHOTO_DAILY_DAYS_JSON;
}

export function isSaturdayOnlyPhotoCode(typeCode: string): boolean {
  return (PHOTO_SATURDAY_ONLY_CODES as readonly string[]).includes(typeCode);
}

export const HANDWRITTEN_ESPRESSO_NOTE =
  'Owner-approved handwritten specification: dose 18 g / yield 36 g. Working-manual 16 g / 50 g is superseded.';
