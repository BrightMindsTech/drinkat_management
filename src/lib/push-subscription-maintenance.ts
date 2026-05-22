import type { PrismaClient } from '@prisma/client';

/**
 * Keep one active APNs row per user (latest token wins). Old reinstall tokens cause repeated delivery failures.
 */
export async function replaceOtherApnsSubscriptions(
  prisma: PrismaClient,
  userId: string,
  keepEndpoint: string
): Promise<number> {
  const result = await prisma.pushSubscription.deleteMany({
    where: {
      userId,
      provider: 'apns',
      endpoint: { not: keepEndpoint },
    },
  });
  return result.count;
}

/**
 * Per user, keep only the newest subscription per provider (removes duplicate stale devices).
 */
export async function pruneDuplicatePushSubscriptions(prisma: PrismaClient): Promise<{
  removed: number;
}> {
  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, userId: true, provider: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const keepIds = new Set<string>();
  const seen = new Set<string>();

  for (const sub of subs) {
    const key = `${sub.userId}:${sub.provider}`;
    if (seen.has(key)) continue;
    seen.add(key);
    keepIds.add(sub.id);
  }

  const staleIds = subs.filter((s) => !keepIds.has(s.id)).map((s) => s.id);
  if (staleIds.length === 0) return { removed: 0 };

  const result = await prisma.pushSubscription.deleteMany({
    where: { id: { in: staleIds } },
  });
  return { removed: result.count };
}
