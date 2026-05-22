import { prisma } from '@/lib/prisma';
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_APP_TIMEZONE, localCalendarDayBoundsUtc, minutesUntilShiftStart } from '@/lib/shifts';
import { normalizeUserRole } from '@/lib/formVisibility';
import { notifyUser } from '@/lib/user-notify';

/** ~30 minutes before shift start; wide enough for the 3-minute Worker cron. */
const REMIND_MIN = 25;
const REMIND_MAX = 55;

/**
 * Once per local calendar day, remind employees (with push consent) to clock in
 * shortly before their assigned shift starts, if they are not already clocked in.
 */
export async function sendClockInRemindersIfInWindow(): Promise<{ sent: number; checked: number }> {
  const now = new Date();
  const tz = DEFAULT_APP_TIMEZONE;
  const localYmd = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const { dayStartUtc, nextDayStartUtc } = localCalendarDayBoundsUtc(now, tz);

  const employees = await prisma.employee.findMany({
    where: {
      status: { not: 'terminated' },
      userId: { not: null },
      shiftDefinitionId: { not: null },
      user: {
        pushConsentAt: { not: null },
      },
    },
    include: {
      user: { select: { id: true, role: true } },
      shiftDefinition: true,
      branch: { select: { shiftProfile: true } },
    },
  });

  let sent = 0;
  for (const emp of employees) {
    const userId = emp.userId;
    if (!userId || !emp.user || !emp.shiftDefinition) continue;
    if (normalizeUserRole(emp.user.role) === 'owner') continue;

    const open = await prisma.timeClockEntry.findFirst({
      where: { employeeId: emp.id, clockOutAt: null },
      select: { id: true },
    });
    if (open) continue;

    const clockedInToday = await prisma.timeClockEntry.findFirst({
      where: {
        employeeId: emp.id,
        clockInAt: { gte: dayStartUtc, lt: nextDayStartUtc },
      },
      select: { id: true },
    });
    if (clockedInToday) continue;

    const minutes = minutesUntilShiftStart(now, emp.shiftDefinition, tz, {
      shiftProfile: emp.branch?.shiftProfile ?? 'default',
    });
    if (minutes < REMIND_MIN || minutes > REMIND_MAX) continue;

    const watermarkKey = `clockin_daily:${userId}:${localYmd}`;
    const already = await prisma.appCronWatermark.findUnique({ where: { key: watermarkKey } });
    if (already) continue;

    try {
      await notifyUser(prisma, userId, {
        category: 'clock_in_reminder',
        title: 'Time clock',
        body: 'Reminder: please clock in when you arrive at your branch.',
        dataJson: JSON.stringify({
          type: 'clock_in_reminder',
          href: '/dashboard/time-clock',
        }),
        push: {
          title: 'Time clock',
          body: 'Reminder: please clock in when you arrive at your branch.',
          data: {
            type: 'clock_in_reminder',
            url: '/dashboard/time-clock',
          },
        },
      });
    } catch (e) {
      console.error('[clock-in-reminder] send failed', { userId, e });
      continue;
    }

    await prisma.appCronWatermark.upsert({
      where: { key: watermarkKey },
      create: { key: watermarkKey, lastRunAt: now },
      update: { lastRunAt: now },
    });
    sent += 1;
  }

  return { sent, checked: employees.length };
}
