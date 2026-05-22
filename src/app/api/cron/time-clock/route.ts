import { checkDatabaseHealth } from '@/lib/db-health';
import { prisma } from '@/lib/prisma';
import { runSalaryDistributionIfDue } from '@/lib/salary-distribution';
import { purgeExpiredChat } from '@/lib/chat-retention';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { sendClockInRemindersIfInWindow } from '@/lib/clock-in-reminder';
import { sendClockOutRemindersIfInWindow } from '@/lib/clock-out-reminder';
import { sendWeeklyRatingRemindersIfDue } from '@/lib/weekly-rating-reminders';
import { maybeRunAutoClockOutIfDue } from '@/lib/auto-clock-out-daily';

/**
 * Authenticated with CRON_SECRET (query `?secret=` or `Authorization: Bearer`).
 * Runs away-session expiry **and** chat retention purge.
 * Chat retention also runs automatically (throttled) when anyone loads Messages — no URL schedule required.
 * This endpoint is optional: use it if you already ping it for away-session processing.
 * For ~30m-before-shift clock-in / clock-out push reminders, call this (or a dedicated schedule) on an interval
 * of a few minutes so the 24–36 minute window is hit reliably.
 *
 * **Daily 4:00 AM auto clock-out** normally runs from app traffic via `maybeRunAutoClockOutIfDue` (watermark —
 * no HTTP scheduler required). This cron still calls the same helper if you keep a schedule; optional.
 * `AUTO_CLOCK_OUT_4AM=false` disables; see `src/lib/ramadan.ts`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 501 });
  }
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : new URL(req.url).searchParams.get('secret');
  if (token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.ok) {
    console.error('[cron/time-clock] database health failed', dbHealth.error);
    return Response.json({ ok: false, db: false, error: 'database unavailable' }, { status: 503 });
  }

  const awayProcessed = await processExpiredAwaySessions();

  let autoClockOut4am: Awaited<ReturnType<typeof maybeRunAutoClockOutIfDue>> | null = null;
  try {
    autoClockOut4am = await maybeRunAutoClockOutIfDue();
  } catch (e) {
    console.error('[cron/time-clock] auto clock-out 4am failed', e);
  }

  let chat: { messagesDeleted: number; threadsDeleted: number; typingDeleted: number } | null = null;
  let weeklyRatings: { sentUsers: number; weekKey: string; skipped: boolean } | null = null;
  let clockOutReminders: { sent: number; checked: number } | null = null;
  let clockInReminders: { sent: number; checked: number } | null = null;
  try {
    chat = await purgeExpiredChat(prisma);
  } catch (e) {
    console.error('[cron/time-clock] chat purge failed', e);
  }
  try {
    weeklyRatings = await sendWeeklyRatingRemindersIfDue();
  } catch (e) {
    console.error('[cron/time-clock] weekly rating reminders failed', e);
  }
  try {
    clockOutReminders = await sendClockOutRemindersIfInWindow();
  } catch (e) {
    console.error('[cron/time-clock] clock-out shift reminders failed', e);
  }
  try {
    clockInReminders = await sendClockInRemindersIfInWindow();
  } catch (e) {
    console.error('[cron/time-clock] clock-in reminders failed', e);
  }

  try {
    await runSalaryDistributionIfDue();
  } catch (e) {
    console.error('[cron/time-clock] salary distribution failed', e);
  }

  return Response.json({
    ok: true,
    db: true,
    processed: awayProcessed,
    autoClockOut4am,
    chat,
    weeklyRatings,
    clockOutReminders,
    clockInReminders,
  });
}
