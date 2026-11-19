import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { photoInstantInZone, photoPeriodKey, shiftPhotoPeriodKey } from '@/lib/photo-time';

/** MEU / HU (and any other daytime branch): 8am, 12pm, 4pm Asia/Amman. */
export const PHOTO_REMINDER_DAY_SLOTS = ['08:00', '12:00', '16:00'] as const;
/** Airport Street + Cloud Kitchen: same, plus 8pm and midnight. */
export const PHOTO_REMINDER_LATE_SLOTS = ['08:00', '12:00', '16:00', '20:00', '00:00'] as const;

export function isLatePhotoReminderBranch(branchName: string | null | undefined): boolean {
  const n = (branchName ?? '').toLowerCase();
  return n.includes('airport') || n.includes('cloud kitchen');
}

export function photoReminderSlotsForBranch(branchName: string | null | undefined): readonly string[] {
  return isLatePhotoReminderBranch(branchName) ? PHOTO_REMINDER_LATE_SLOTS : PHOTO_REMINDER_DAY_SLOTS;
}

export function latestDuePhotoReminderSlot(
  now: Date,
  branchName: string | null | undefined,
  timeZone = DEFAULT_APP_TIMEZONE
): { hm: string; at: Date } | null {
  const slots = photoReminderSlotsForBranch(branchName);
  const today = photoPeriodKey(now, timeZone);
  const yesterday = shiftPhotoPeriodKey(today, -1, timeZone);
  let best: { hm: string; at: Date } | null = null;
  for (const day of [yesterday, today]) {
    for (const hm of slots) {
      const at = photoInstantInZone(day, hm, timeZone);
      if (at.getTime() > now.getTime()) continue;
      if (!best || at.getTime() > best.at.getTime()) best = { hm, at };
    }
  }
  return best;
}

/** Send when the latest clock slot for this branch is due and we have not already fired that slot. */
/** One push per person — latest lastRemindedAt across their open tasks. */
export function latestPhotoReminderAt(times: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const t of times) {
    if (!t) continue;
    if (!latest || t.getTime() > latest.getTime()) latest = t;
  }
  return latest;
}

export function shouldSendPhotoReminderAtClock(
  lastRemindedAt: Date | null,
  now: Date,
  branchName: string | null | undefined,
  timeZone = DEFAULT_APP_TIMEZONE
): boolean {
  const slot = latestDuePhotoReminderSlot(now, branchName, timeZone);
  if (!slot) return false;
  if (!lastRemindedAt) return true;
  return lastRemindedAt.getTime() < slot.at.getTime();
}
