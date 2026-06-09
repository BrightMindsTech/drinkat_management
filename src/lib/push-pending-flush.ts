import type { PrismaClient } from '@prisma/client';
import { enrichPushData } from '@/lib/push-navigation';
import { buildQcAssignmentNotifyInput } from '@/lib/qc-assignment-notify';
import { sendPushToUser } from '@/lib/push';
import { notifyUser } from '@/lib/user-notify';

const PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FLUSH_PER_USER_LIMIT = 15;

function parseInboxDataJson(dataJson: string | null): Record<string, string> {
  if (!dataJson) return {};
  try {
    const parsed = JSON.parse(dataJson) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function inboxRowToPushPayload(row: {
  category: string;
  title: string;
  body: string;
  dataJson: string | null;
}) {
  const data = parseInboxDataJson(row.dataJson);
  const pushData: Record<string, string> = { type: data.type ?? row.category };
  if (data.href) pushData.url = data.href;
  if (data.assignmentId) pushData.assignmentId = data.assignmentId;
  if (data.submissionId) pushData.submissionId = data.submissionId;
  if (data.threadId) pushData.threadId = data.threadId;
  return {
    title: row.title,
    body: row.body,
    data: enrichPushData(pushData),
  };
}

/** Deliver inbox rows that were created before a device was registered or when push failed. */
export async function flushPendingPushForUser(
  prisma: PrismaClient,
  userId: string
): Promise<{ attempted: number; delivered: number }> {
  const since = new Date(Date.now() - PENDING_MAX_AGE_MS);
  const pending = await prisma.inboxNotification.findMany({
    where: {
      userId,
      pushSentAt: null,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'asc' },
    take: FLUSH_PER_USER_LIMIT,
  });
  if (pending.length === 0) return { attempted: 0, delivered: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { attempted: pending.length, delivered: 0 };

  let delivered = 0;
  for (const row of pending) {
    const payload = inboxRowToPushPayload(row);
    const { delivered: count } = await sendPushToUser(userId, subs, payload);
    if (count > 0) {
      delivered += count;
      await prisma.inboxNotification.update({
        where: { id: row.id },
        data: { pushSentAt: new Date() },
      });
    }
  }

  if (delivered > 0) {
    console.log('[push-pending-flush] delivered pending inbox pushes', {
      userId,
      attempted: pending.length,
      delivered,
    });
  }

  return { attempted: pending.length, delivered };
}

/** Backfill assignment alerts when assign-time notify was skipped (e.g. no login yet). */
export async function backfillMissedQcAssignmentNotifications(
  prisma: PrismaClient,
  userId: string
): Promise<number> {
  const since = new Date(Date.now() - PENDING_MAX_AGE_MS);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { employee: { select: { id: true } } },
  });
  if (!user?.employee) return 0;

  const assignments = await prisma.checklistAssignment.findMany({
    where: { employeeId: user.employee.id, createdAt: { gte: since } },
    include: { checklist: { select: { name: true, repeatsDaily: true } } },
    orderBy: { createdAt: 'asc' },
  });
  if (assignments.length === 0) return 0;

  const existing = await prisma.inboxNotification.findMany({
    where: {
      userId,
      category: 'qc_assignment_created',
      createdAt: { gte: since },
    },
    select: { dataJson: true },
  });
  const notifiedIds = new Set<string>();
  for (const row of existing) {
    const data = parseInboxDataJson(row.dataJson);
    if (data.assignmentId) notifiedIds.add(data.assignmentId);
  }

  let backfilled = 0;
  for (const assignment of assignments) {
    if (notifiedIds.has(assignment.id)) continue;
    await notifyUser(prisma, userId, buildQcAssignmentNotifyInput(assignment));
    backfilled += 1;
  }

  if (backfilled > 0) {
    console.log('[push-pending-flush] backfilled missed QC assignment notifications', {
      userId,
      backfilled,
    });
  }

  return backfilled;
}

/** Run after push registration or on cron — backfill missed assignments then flush pending inbox pushes. */
export async function retryPendingPushForUser(
  prisma: PrismaClient,
  userId: string
): Promise<{ backfilled: number; attempted: number; delivered: number }> {
  const backfilled = await backfillMissedQcAssignmentNotifications(prisma, userId);
  const flush = await flushPendingPushForUser(prisma, userId);
  return { backfilled, ...flush };
}

/** Cron: retry pending pushes for users who now have a registered device. */
export async function flushPendingPushBatch(
  prisma: PrismaClient,
  maxUsers = 25
): Promise<{ users: number; delivered: number }> {
  const since = new Date(Date.now() - PENDING_MAX_AGE_MS);
  const rows = await prisma.inboxNotification.findMany({
    where: {
      pushSentAt: null,
      createdAt: { gte: since },
      user: { pushSubscriptions: { some: {} } },
    },
    select: { userId: true },
    distinct: ['userId'],
    take: maxUsers,
  });

  let delivered = 0;
  for (const row of rows) {
    const result = await retryPendingPushForUser(prisma, row.userId);
    delivered += result.delivered;
  }

  if (rows.length > 0) {
    console.log('[push-pending-flush] cron batch done', {
      users: rows.length,
      delivered,
    });
  }

  return { users: rows.length, delivered };
}
