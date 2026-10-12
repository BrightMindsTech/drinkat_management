import { checkDatabaseHealth } from '@/lib/db-health';
import { logErrorThrottled } from '@/lib/log-throttle';
import { prisma } from '@/lib/prisma';
import { runSalaryDistributionIfDue } from '@/lib/salary-distribution';
import { purgeExpiredChat } from '@/lib/chat-retention';
import { sendWeeklyRatingRemindersIfDue } from '@/lib/weekly-rating-reminders';
import { sendPushKeepaliveIfDue } from '@/lib/push-keepalive-cron';
import { flushPendingPushBatch } from '@/lib/push-pending-flush';
import { sendQcSubmitRemindersIfDue } from '@/lib/qc-submit-reminders';
import { sendDailyAppRemindersIfDue } from '@/lib/daily-app-reminders';
import { generateInspectionTasksForDay, isInspectionSchedulerEnabled } from '@/lib/inspection-generate';
import { sendInspectionTaskRemindersIfDue, sendIssueEscalationsIfDue } from '@/lib/inspection-reminders';
import { generatePhotoCheckTasksForDay, isPhotoCheckSchedulerEnabled } from '@/lib/photo-generate';
import { ensureOfficialPhotoProgram } from '@/lib/photo-ops-program';
import { sendPhotoCheckRemindersIfDue } from '@/lib/photo-reminders';

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

  let qcSubmitReminders: Awaited<ReturnType<typeof sendQcSubmitRemindersIfDue>> | null = null;
  try {
    qcSubmitReminders = await sendQcSubmitRemindersIfDue(prisma);
  } catch (e) {
    console.error('[cron/maintenance] QC submit reminders failed', e);
  }

  let dailyAppReminders: Awaited<ReturnType<typeof sendDailyAppRemindersIfDue>> | null = null;
  try {
    dailyAppReminders = await sendDailyAppRemindersIfDue(prisma);
  } catch (e) {
    console.error('[cron/maintenance] daily app reminders failed', e);
  }

  let inspectionGeneration: { created: number; skipped: number; overdue: number } | null = null;
  let inspectionReminders: { sent: number } | null = null;
  let issueEscalations: { sent: number } | null = null;
  if (isInspectionSchedulerEnabled()) {
    try {
      inspectionGeneration = await generateInspectionTasksForDay(prisma);
    } catch (e) {
      console.error('[cron/maintenance] inspection generation failed', e);
    }
    try {
      inspectionReminders = await sendInspectionTaskRemindersIfDue(prisma);
    } catch (e) {
      console.error('[cron/maintenance] inspection reminders failed', e);
    }
    try {
      issueEscalations = await sendIssueEscalationsIfDue(prisma);
    } catch (e) {
      console.error('[cron/maintenance] issue escalations failed', e);
    }
  }

  let photoGeneration: { created: number; skipped: number; overdue: number } | null = null;
  let photoReminders: { sent: number; skipped: number } | null = null;
  if (isPhotoCheckSchedulerEnabled()) {
    try {
      await ensureOfficialPhotoProgram(prisma);
      photoGeneration = await generatePhotoCheckTasksForDay(prisma);
    } catch (e) {
      console.error('[cron/maintenance] photo-check generation failed', e);
    }
    try {
      photoReminders = await sendPhotoCheckRemindersIfDue(prisma);
    } catch (e) {
      console.error('[cron/maintenance] photo-check reminders failed', e);
    }
  }

  return Response.json({
    ok: true,
    db: true,
    chat,
    weeklyRatings,
    pushKeepalive,
    pushPendingFlush,
    qcSubmitReminders,
    dailyAppReminders,
    inspectionGeneration,
    inspectionReminders,
    issueEscalations,
    inspectionScheduler: isInspectionSchedulerEnabled(),
    photoGeneration,
    photoReminders,
    photoCheckScheduler: isPhotoCheckSchedulerEnabled(),
  });
}
