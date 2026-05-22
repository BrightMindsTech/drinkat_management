import type { PrismaClient } from '@prisma/client';

const BROADCAST_COOLDOWN_MS = 2 * 60 * 1000;
const WATERMARK_KEY = 'owner_push_broadcast:last';

export type OwnerPushBroadcastInput = {
  title: string;
  body: string;
  /** In-app path when the notification is opened (must start with /). */
  href?: string;
};

export type OwnerPushBroadcastResult = {
  recipientUsers: number;
  /** Users with at least one push subscription row. */
  usersWithPushDevice: number;
  /** Users who received at least one successful push delivery. */
  usersReachedByPush: number;
  usersWithoutPushDevice: number;
  pushSubscriptionsAttempted: number;
  pushSubscriptionsDelivered: number;
  pushSubscriptionsExpiredRemoved: number;
  duplicateSubscriptionsPruned: number;
  /** @deprecated Use pushSubscriptionsDelivered — kept for older clients. */
  pushDelivered: number;
};

function normalizeHref(href: string | undefined): string {
  const raw = (href ?? '/dashboard').trim();
  if (!raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//')) return '/dashboard';
  return raw;
}

export async function getOwnerPushBroadcastCooldownRemainingMs(
  prisma: PrismaClient
): Promise<number> {
  const row = await prisma.appCronWatermark.findUnique({ where: { key: WATERMARK_KEY } });
  if (!row) return 0;
  const elapsed = Date.now() - row.lastRunAt.getTime();
  return Math.max(0, BROADCAST_COOLDOWN_MS - elapsed);
}

/** Sends a custom push announcement to every user with a registered device. */
export async function sendOwnerPushBroadcast(
  prisma: PrismaClient,
  input: OwnerPushBroadcastInput
): Promise<OwnerPushBroadcastResult> {
  const remaining = await getOwnerPushBroadcastCooldownRemainingMs(prisma);
  if (remaining > 0) {
    throw new OwnerPushBroadcastCooldownError(remaining);
  }

  const title = input.title.trim();
  const body = input.body.trim();
  const href = normalizeHref(input.href);
  const now = new Date();

  const { pruneDuplicatePushSubscriptions } = await import('@/lib/push-subscription-maintenance');
  const { removed: duplicateSubscriptionsPruned } = await pruneDuplicatePushSubscriptions(prisma);

  const users = await prisma.user.findMany({ select: { id: true } });
  const allSubs = await prisma.pushSubscription.findMany();
  const subsByUserId = new Map<string, typeof allSubs>();
  for (const sub of allSubs) {
    const list = subsByUserId.get(sub.userId) ?? [];
    list.push(sub);
    subsByUserId.set(sub.userId, list);
  }

  let pushSubscriptionsAttempted = 0;
  let pushSubscriptionsDelivered = 0;
  let pushSubscriptionsExpiredRemoved = 0;
  let usersReachedByPush = 0;

  const { sendPushToUser } = await import('@/lib/push');

  for (const user of users) {
    const subs = subsByUserId.get(user.id) ?? [];
    if (subs.length === 0) continue;

    pushSubscriptionsAttempted += subs.length;
    const { delivered, expiredRemoved } = await sendPushToUser(user.id, subs, {
      title,
      body,
      data: { type: 'owner_broadcast', url: href },
    });
    pushSubscriptionsDelivered += delivered;
    pushSubscriptionsExpiredRemoved += expiredRemoved;
    if (delivered > 0) usersReachedByPush += 1;
  }

  const usersWithPushDevice = subsByUserId.size;
  const usersWithoutPushDevice = Math.max(0, users.length - usersWithPushDevice);

  await prisma.appCronWatermark.upsert({
    where: { key: WATERMARK_KEY },
    create: { key: WATERMARK_KEY, lastRunAt: now },
    update: { lastRunAt: now },
  });

  return {
    recipientUsers: users.length,
    usersWithPushDevice,
    usersReachedByPush,
    usersWithoutPushDevice,
    pushSubscriptionsAttempted,
    pushSubscriptionsDelivered,
    pushSubscriptionsExpiredRemoved,
    duplicateSubscriptionsPruned,
    pushDelivered: pushSubscriptionsDelivered,
  };
}

/** Stats shown on the owner broadcast form before sending. */
export async function getOwnerPushBroadcastAudienceStats(prisma: PrismaClient): Promise<{
  userCount: number;
  pushUserCount: number;
  usersWithoutPushDevice: number;
  pushSubscriptionCount: number;
}> {
  const [userCount, pushSubscriptionCount, pushUserRows] = await Promise.all([
    prisma.user.count(),
    prisma.pushSubscription.count(),
    prisma.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] }),
  ]);
  const pushUserCount = pushUserRows.length;
  return {
    userCount,
    pushUserCount,
    usersWithoutPushDevice: Math.max(0, userCount - pushUserCount),
    pushSubscriptionCount,
  };
}

export class OwnerPushBroadcastCooldownError extends Error {
  readonly remainingMs: number;

  constructor(remainingMs: number) {
    super('Broadcast cooldown active');
    this.name = 'OwnerPushBroadcastCooldownError';
    this.remainingMs = remainingMs;
  }
}
