import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

/**
 * Owner-confirmed 360° Branch Cleanliness windows. Times are local Asia/Amman.
 * 360° is several photographs of different branch corners in one submission, not a panorama.
 */
export const PHOTO_OFFICIAL_TIMEZONE = DEFAULT_APP_TIMEZONE;

export const PHOTO_360_OFFICIAL_WINDOWS = [
  { slotKey: 'morning', slotLabelEn: 'Morning', slotLabelAr: 'صباح', startTime: '08:00', dueTime: '13:00' },
  { slotKey: 'midday', slotLabelEn: 'Midday', slotLabelAr: 'ظهر', startTime: '14:00', dueTime: '18:00' },
  { slotKey: 'night', slotLabelEn: 'Night', slotLabelAr: 'ليل', startTime: '20:00', dueTime: '02:00' },
] as const;

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
