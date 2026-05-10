import { parse } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { prisma } from '@/lib/prisma';
import { DEFAULT_APP_TIMEZONE, localMinutesFromDate } from '@/lib/shifts';
import { isRamadanUmmAlQura } from '@/lib/ramadan';
import { createInboxForUsers, getOwnerUserIds } from '@/lib/time-clock-helpers';

const CUTOFF_MINUTES = 4 * 60; // 04:00 local
const REASON = 'auto_daily_4am';
const WATERMARK_KEY = 'auto_clock_out_4am';

export type AutoClockOutDailyResult =
  | { ran: false; reason: 'disabled' | 'ramadan' | 'before_4am'; timezone: string }
  | {
      ran: true;
      timezone: string;
      cutoffUtc: string;
      closedCount: number;
      employeesAffected: number;
    };

export type MaybeAutoClockOutResult =
  | { executed: false; reason: 'disabled' | 'before_4am' | 'ramadan' | 'already_ran_today' }
  | AutoClockOutDailyResult;

/**
 * Once per local day after 04:00 (APP_TIMEZONE), clocks out every open shift with `clockOutAt` = that day's 04:00 local.
 * Skipped entirely during Ramadan (Islamic month 9, Umm al-Qura) so 24h Ramadan operations are not cut off.
 *
 * Idempotent: safe to call on every cron tick; only does work when local time is ≥ 04:00 and there are open entries.
 *
 * Env:
 * - `AUTO_CLOCK_OUT_4AM=false` — disable this job
 * - `RAMADAN_CALENDAR=force` — treat every day as Ramadan (see ramadan.ts)
 *
 * For **no external scheduler**, use {@link maybeRunAutoClockOutIfDue} from normal API traffic instead.
 */
export async function runAutoClockOutAfterFourAm(now: Date = new Date()): Promise<AutoClockOutDailyResult> {
  const tz = DEFAULT_APP_TIMEZONE;
  if (process.env.AUTO_CLOCK_OUT_4AM === 'false' || process.env.AUTO_CLOCK_OUT_4AM === '0') {
    return { ran: false, reason: 'disabled', timezone: tz };
  }

  if (isRamadanUmmAlQura(now, tz)) {
    return { ran: false, reason: 'ramadan', timezone: tz };
  }

  const mins = localMinutesFromDate(now, tz);
  if (mins < CUTOFF_MINUTES) {
    return { ran: false, reason: 'before_4am', timezone: tz };
  }

  const ymd = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const cutoffUtc = fromZonedTime(parse(`${ymd} 04:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz);

  const open = await prisma.timeClockEntry.findMany({
    where: { clockOutAt: null },
    select: { id: true, employeeId: true },
  });

  if (open.length === 0) {
    return {
      ran: true,
      timezone: tz,
      cutoffUtc: cutoffUtc.toISOString(),
      closedCount: 0,
      employeesAffected: 0,
    };
  }

  const employeeIds = [...new Set(open.map((e) => e.employeeId))];

  await prisma.$transaction([
    prisma.awaySession.updateMany({
      where: { status: 'active', employeeId: { in: employeeIds } },
      data: { status: 'canceled' },
    }),
    prisma.timeClockEntry.updateMany({
      where: { clockOutAt: null },
      data: {
        clockOutAt: cutoffUtc,
        clockOutReason: REASON,
        clockOutLat: null,
        clockOutLng: null,
      },
    }),
  ]);

  const owners = await getOwnerUserIds();
  if (owners.length > 0 && open.length > 0) {
    const names = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { name: true },
    });
    const nameList = names.map((e) => e.name).join(', ');
    const body =
      open.length <= 8
        ? `Daily 4:00 AM auto clock-out (${tz}): ${open.length} open shift(s) closed. ${nameList}`
        : `Daily 4:00 AM auto clock-out (${tz}): ${open.length} open shifts closed (all still clocked-in staff).`;

    await createInboxForUsers(owners, {
      category: 'time_clock',
      title: `Auto clock-out 4:00 AM — ${open.length} shift(s)`,
      body,
      dataJson: JSON.stringify({
        type: 'auto_daily_4am',
        cutoffUtc: cutoffUtc.toISOString(),
        count: open.length,
        reason: REASON,
      }),
    });
  }

  return {
    ran: true,
    timezone: tz,
    cutoffUtc: cutoffUtc.toISOString(),
    closedCount: open.length,
    employeesAffected: employeeIds.length,
  };
}

/**
 * Runs {@link runAutoClockOutAfterFourAm} at most **once per local calendar day** (after 04:00 APP_TIMEZONE),
 * using `AppCronWatermark` — same pattern as chat retention / form purges: **no HTTP cron ping required**.
 *
 * Call from lightweight authenticated routes (e.g. time-clock status, chat threads).
 */
export async function maybeRunAutoClockOutIfDue(now: Date = new Date()): Promise<MaybeAutoClockOutResult> {
  const tz = DEFAULT_APP_TIMEZONE;

  if (process.env.AUTO_CLOCK_OUT_4AM === 'false' || process.env.AUTO_CLOCK_OUT_4AM === '0') {
    return { executed: false, reason: 'disabled' };
  }

  const mins = localMinutesFromDate(now, tz);
  if (mins < CUTOFF_MINUTES) {
    return { executed: false, reason: 'before_4am' };
  }

  if (isRamadanUmmAlQura(now, tz)) {
    return { executed: false, reason: 'ramadan' };
  }

  const todayYmd = formatInTimeZone(now, tz, 'yyyy-MM-dd');

  try {
    const row = await prisma.appCronWatermark.findUnique({
      where: { key: WATERMARK_KEY },
      select: { lastRunAt: true },
    });
    if (row) {
      const lastYmd = formatInTimeZone(row.lastRunAt, tz, 'yyyy-MM-dd');
      if (lastYmd === todayYmd) {
        return { executed: false, reason: 'already_ran_today' };
      }
    }
  } catch (e) {
    console.error('[auto-clock-out-daily] watermark read failed', e);
  }

  const result = await runAutoClockOutAfterFourAm(now);

  if (result.ran) {
    try {
      await prisma.appCronWatermark.upsert({
        where: { key: WATERMARK_KEY },
        create: { key: WATERMARK_KEY, lastRunAt: now },
        update: { lastRunAt: now },
      });
    } catch (e) {
      console.error('[auto-clock-out-daily] watermark write failed', e);
    }
  }

  return result;
}
