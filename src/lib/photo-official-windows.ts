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

export const HANDWRITTEN_ESPRESSO_NOTE =
  'Owner-approved handwritten specification: dose 18 g / yield 36 g. Working-manual 16 g / 50 g is superseded.';
