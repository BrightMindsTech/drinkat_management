import { checkDatabaseHealth } from '@/lib/db-health';
import { logErrorThrottled } from '@/lib/log-throttle';
import { prisma } from '@/lib/prisma';
import { runSalaryDistributionIfDue } from '@/lib/salary-distribution';
import { purgeExpiredChat } from '@/lib/chat-retention';
import { sendWeeklyRatingRemindersIfDue } from '@/lib/weekly-rating-reminders';
import { sendPushKeepaliveIfDue } from '@/lib/push-keepalive-cron';
import { flushPendingPushBatch } from '@/lib/push-pending-flush';

/**
 * Authenticated with CRON_SECRET (query `?secret=` or `Authorization: Bearer`).
 * Runs scheduled maintenance: chat purge, weekly rating reminders, salary distribution, push keepalive.
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
    logErrorThrottled('db-unavailable', () => {
      console.error('[cron/maintenance] database health failed', dbHealth.error);
    });
    return Response.json({ ok: false, db: false, error: 'database unavailable' }, { status: 503 });
  }

  let chat: { messagesDeleted: number; threadsDeleted: number; typingDeleted: number } | null = null;
  let weeklyRatings: { sentUsers: number; weekKey: string; skipped: boolean } | null = null;
  try {
    chat = await purgeExpiredChat(prisma);
  } catch (e) {
    console.error('[cron/maintenance] chat purge failed', e);
  }
  try {
    weeklyRatings = await sendWeeklyRatingRemindersIfDue();
  } catch (e) {
    console.error('[cron/maintenance] weekly rating reminders failed', e);
  }

  try {
    await runSalaryDistributionIfDue();
  } catch (e) {
    console.error('[cron/maintenance] salary distribution failed', e);
  }

  let pushKeepalive: Awaited<ReturnType<typeof sendPushKeepaliveIfDue>> | null = null;
  try {
    pushKeepalive = await sendPushKeepaliveIfDue(prisma);
  } catch (e) {
    console.error('[cron/maintenance] push keepalive failed', e);
  }

  let pushPendingFlush: Awaited<ReturnType<typeof flushPendingPushBatch>> | null = null;
  try {
    pushPendingFlush = await flushPendingPushBatch(prisma);
  } catch (e) {
    console.error('[cron/maintenance] pending push flush failed', e);
  }

  return Response.json({
    ok: true,
    db: true,
    chat,
    weeklyRatings,
    pushKeepalive,
    pushPendingFlush,
  });
}
