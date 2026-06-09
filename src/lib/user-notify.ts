import type { PrismaClient } from '@prisma/client';
import { getOwnerUserIds } from '@/lib/notify-helpers';
import { sendPushToUser, type PushPayload } from '@/lib/push';

export type UserNotifyInput = {
  category: string;
  title: string;
  body: string;
  dataJson?: string | null;
  push?: PushPayload;
};

/**
 * Reliable notification: always writes in-app inbox; push is best-effort when registered.
 * Undelivered pushes stay pending (pushSentAt null) and are retried on register / cron.
 */
export async function notifyUsers(
  prisma: PrismaClient,
  userIds: string[],
  input: UserNotifyInput
): Promise<{ inbox: number; pushSent: number }> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { inbox: 0, pushSent: 0 };

  let subsByUser = new Map<string, Awaited<ReturnType<typeof prisma.pushSubscription.findMany>>>();
  if (input.push) {
    const allSubs = await prisma.pushSubscription.findMany({
      where: { userId: { in: unique } },
    });
    for (const sub of allSubs) {
      const list = subsByUser.get(sub.userId) ?? [];
      list.push(sub);
      subsByUser.set(sub.userId, list);
    }
  }

  const usersWithoutDevice: string[] = [];
  let inbox = 0;
  let pushSent = 0;

  for (const userId of unique) {
    const row = await prisma.inboxNotification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        category: input.category,
        title: input.title,
        body: input.body,
        dataJson: input.dataJson ?? null,
      },
    });
    inbox += 1;

    if (!input.push) continue;

    const subs = subsByUser.get(userId) ?? [];
    if (subs.length === 0) {
      usersWithoutDevice.push(userId);
      continue;
    }

    const { delivered } = await sendPushToUser(userId, subs, input.push);
    pushSent += delivered;
    if (delivered > 0) {
      await prisma.inboxNotification.update({
        where: { id: row.id },
        data: { pushSentAt: new Date() },
      });
    } else {
      console.warn('[notify] push delivery failed for all devices — will retry', {
        userId,
        category: input.category,
        deviceCount: subs.length,
        inboxId: row.id,
      });
    }
  }

  if (usersWithoutDevice.length > 0) {
    console.warn('[notify] push pending — no registered device (will retry on register)', {
      category: input.category,
      count: usersWithoutDevice.length,
      sampleUserIds: usersWithoutDevice.slice(0, 3),
    });
  }

  return { inbox, pushSent };
}

export async function notifyUser(prisma: PrismaClient, userId: string, input: UserNotifyInput) {
  return notifyUsers(prisma, [userId], input);
}

/** Owners always receive request/report alerts; managers are included when resolved. */
export async function notifyOwnersAndManager(
  prisma: PrismaClient,
  managerUserId: string | null | undefined,
  input: UserNotifyInput,
  extraUserIds: string[] = []
): Promise<{ inbox: number; pushSent: number }> {
  const ownerIds = await getOwnerUserIds();
  const userIds = [...(managerUserId ? [managerUserId] : []), ...ownerIds, ...extraUserIds];
  return notifyUsers(prisma, userIds, input);
}
