import { prisma } from '@/lib/prisma';
import { DEFAULT_APP_TIMEZONE, minutesUntilShiftEnd } from '@/lib/shifts';
import { sendPushToUser } from '@/lib/push';

/** Wider than ±1 cron tick so 5min schedules still land once; first hit in range wins (deduped). */
const REMIND_MIN = 24;
const REMIND_MAX = 36;

/**
 * For employees still clocked in, send a one-time push when shift end is about 30 minutes away
 * (same `minutesUntilShiftEnd` as the rest of the time clock; airport night rules include Fri exception).
 * Dedupes per user per "shift end minute" bucket so cron can run every few minutes.
 */
export async function sendClockOutRemindersIfInWindow(): Promise<{ sent: number; checked: number }> {
  const now = new Date();
  const open = await prisma.timeClockEntry.findMany({
    where: { clockOutAt: null },
    orderBy: { clockInAt: 'desc' },
    include: {
      employee: {
        include: {
          user: { select: { id: true } },
          shiftDefinition: true,
          branch: { select: { shiftProfile: true } },
        },
      },
    },
  });

  const seenEmployee = new Set<string>();
  let sent = 0;
  for (const entry of open) {
    const eid = entry.employeeId;
    if (seenEmployee.has(eid)) continue;
    seenEmployee.add(eid);

    const emp = entry.employee;
    const userId = emp.userId;
    if (!userId) continue;
    const shift = emp.shiftDefinition;
    if (!shift) continue;

    const minutes = minutesUntilShiftEnd(
      now,
      shift,
      DEFAULT_APP_TIMEZONE,
      { shiftProfile: emp.branch?.shiftProfile ?? 'default' }
    );

    if (minutes <= 0 || minutes < REMIND_MIN || minutes > REMIND_MAX) continue;

    const endMs = now.getTime() + minutes * 60_000;
    const endMinuteBucket = Math.floor(endMs / 60_000);
    const watermarkKey = `clockout_shifts_remind:${userId}:${endMinuteBucket}`;

    const already = await prisma.appCronWatermark.findUnique({ where: { key: watermarkKey } });
    if (already) continue;

    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) continue;

    try {
      await sendPushToUser(userId, subs, {
        title: 'Time clock',
        body: "Please don't forget to clock out before your shift ends.",
        data: {
          type: 'clock_out_shifts_remind',
          url: '/dashboard/time-clock',
        },
      });
    } catch (e) {
      console.error('[clock-out-reminder] send failed', { userId, e });
      continue;
    }

    await prisma.appCronWatermark.upsert({
      where: { key: watermarkKey },
      create: { key: watermarkKey, lastRunAt: now },
      update: { lastRunAt: now },
    });
    sent += 1;
  }

  return { sent, checked: seenEmployee.size };
}
