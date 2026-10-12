import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import {
  parsePhotoDaysOfWeek,
  photoPeriodKey,
  photoWeekday,
  photoWindowInstants,
  shiftPhotoPeriodKey,
} from '@/lib/photo-time';

export { shiftPhotoPeriodKey };

export type PhotoScheduleForUpcoming = {
  scheduleId: string;
  typeId: string;
  slotKey: string;
  slotLabelEn: string;
  slotLabelAr: string;
  startTime: string;
  dueTime: string;
  daysOfWeekJson: string;
};

export type UpcomingPhotoWindow = {
  scheduleId: string;
  typeId: string;
  slotKey: string;
  slotLabelEn: string;
  slotLabelAr: string;
  periodKey: string;
  windowStartAt: Date;
  dueAt: Date;
};

/** Recurring windows that have not opened yet, looking a few Asia/Amman days ahead. */
export function listUpcomingPhotoWindows(
  schedules: PhotoScheduleForUpcoming[],
  now: Date,
  daysAhead = 2,
  timeZone = DEFAULT_APP_TIMEZONE
): UpcomingPhotoWindow[] {
  const todayKey = photoPeriodKey(now, timeZone);
  const out: UpcomingPhotoWindow[] = [];
  for (const schedule of schedules) {
    const days = parsePhotoDaysOfWeek(schedule.daysOfWeekJson);
    for (let d = 0; d <= daysAhead; d += 1) {
      const periodKey = shiftPhotoPeriodKey(todayKey, d, timeZone);
      const weekday = photoWeekday(periodKey, timeZone);
      if (days.length > 0 && !days.includes(weekday)) continue;
      const { windowStartAt, dueAt } = photoWindowInstants(
        periodKey,
        schedule.startTime,
        schedule.dueTime,
        timeZone
      );
      if (windowStartAt.getTime() <= now.getTime()) continue;
      out.push({
        scheduleId: schedule.scheduleId,
        typeId: schedule.typeId,
        slotKey: schedule.slotKey,
        slotLabelEn: schedule.slotLabelEn,
        slotLabelAr: schedule.slotLabelAr,
        periodKey,
        windowStartAt,
        dueAt,
      });
    }
  }
  out.sort((a, b) => a.windowStartAt.getTime() - b.windowStartAt.getTime());
  return out;
}

/** Rows that share the soonest start instant (the next photo wave). */
export function nextPhotoWave<T extends { windowStartAt: Date | string }>(rows: T[]): T[] {
  if (!rows.length) return [];
  const sorted = [...rows].sort(
    (a, b) => new Date(a.windowStartAt).getTime() - new Date(b.windowStartAt).getTime()
  );
  const t0 = new Date(sorted[0].windowStartAt).getTime();
  return sorted.filter((row) => Math.abs(new Date(row.windowStartAt).getTime() - t0) < 60_000);
}

export function formatPhotoCountdown(ms: number, locale: 'en' | 'ar' = 'en'): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (locale === 'ar') {
    if (h > 0) return `${h} س ${m} د`;
    if (m > 0) return `${m} د ${s} ث`;
    return `${s} ث`;
  }
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
