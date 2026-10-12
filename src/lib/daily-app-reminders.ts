import type { PrismaClient } from '@prisma/client';
import { ammanCalendarDayKey, ammanDateParts } from '@/lib/format-datetime';
import { notifyUser } from '@/lib/user-notify';

const REMINDER_TITLE = 'Daily reminder';
const REMINDER_BODY = "Don't forget to open the application. And do your daily tasks.";

const SLOT_8AM_MINUTES = 8 * 60;
const SLOT_3PM_MINUTES = 15 * 60;

export type DailyAppReminderSlot = '8am' | '3pm';

function ammanMinutesNow(now: Date): number {
  const { hours, minutes } = ammanDateParts(now);
  return hours * 60 + minutes;
}

/** Cron window — matches the 5-minute schedule. */
function inCronWindow(targetMinutes: number, nowMinutes: number, windowMinutes = 5): boolean {
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}

export function dailyAppReminderSlotNow(now = new Date()): DailyAppReminderSlot | null {
  const nowMin = ammanMinutesNow(now);
  if (inCronWindow(SLOT_8AM_MINUTES, nowMin)) return '8am';
  if (inCronWindow(SLOT_3PM_MINUTES, nowMin)) return '3pm';
  return null;
}

export function dailyAppReminderWatermarkKey(userId: string, dayKey: string, slot: DailyAppReminderSlot): string {
  return `daily_app_reminder:${userId}:${dayKey}:${slot}`;
}

/** Twice-daily push + in-app reminder for every user (8:00 and 15:00 Amman). */
export async function sendDailyAppRemindersIfDue(prisma: PrismaClient): Promise<{
  slot: DailyAppReminderSlot | null;
  users: number;
  sent: number;
  skippedAlreadySent: number;
}> {
  const now = new Date();
  const slot = dailyAppReminderSlotNow(now);
  if (!slot) return { slot: null, users: 0, sent: 0, skippedAlreadySent: 0 };

  const todayKey = ammanCalendarDayKey(now);
  const users = await prisma.user.findMany({ select: { id: true } });

  let sent = 0;
  let skippedAlreadySent = 0;
  const href = '/dashboard';

  for (const user of users) {
    const watermarkKey = dailyAppReminderWatermarkKey(user.id, todayKey, slot);
    const existing = await prisma.appCronWatermark.findUnique({ where: { key: watermarkKey } });
    if (existing) {
      skippedAlreadySent += 1;
      continue;
    }

    await notifyUser(prisma, user.id, {
      category: 'daily_app_reminder',
      title: REMINDER_TITLE,
      body: REMINDER_BODY,
      dataJson: JSON.stringify({
        type: 'daily_app_reminder',
        href,
        slot,
      }),
      push: {
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
        data: {
          type: 'daily_app_reminder',
          url: href,
        },
      },
    });

    await prisma.appCronWatermark.upsert({
      where: { key: watermarkKey },
      create: { key: watermarkKey, lastRunAt: now },
      update: { lastRunAt: now },
    });
    sent += 1;
  }

  if (sent > 0) {
    console.log('[daily-app-reminders] sent', { slot, sent, todayKey });
  }

  return { slot, users: users.length, sent, skippedAlreadySent };
}
