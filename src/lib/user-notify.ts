import type { PrismaClient } from '@prisma/client';
import { createInboxForUsers } from '@/lib/time-clock-helpers';
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
 * Use this instead of push-only paths that silently skip users with no subscription row.
 */
export async function notifyUsers(
  prisma: PrismaClient,
  userIds: string[],
  input: UserNotifyInput
): Promise<{ inbox: number; pushSent: number }> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return { inbox: 0, pushSent: 0 };

  await createInboxForUsers(unique, {
    category: input.category,
    title: input.title,
    body: input.body,
    dataJson: input.dataJson ?? null,
  });

  if (!input.push) return { inbox: unique.length, pushSent: 0 };

  let pushSent = 0;
  for (const userId of unique) {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) continue;
    const { delivered } = await sendPushToUser(userId, subs, input.push);
    pushSent += delivered;
  }
  return { inbox: unique.length, pushSent };
}

export async function notifyUser(prisma: PrismaClient, userId: string, input: UserNotifyInput) {
  return notifyUsers(prisma, [userId], input);
}
