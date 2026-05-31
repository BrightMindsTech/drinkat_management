import type { PrismaClient } from '@prisma/client';

/**
 * Remove duplicate rows that share the exact same push endpoint (data bug / re-import).
 * Does NOT limit one device per user — multiple phones may share one login and each keeps its token.
 */
export async function pruneDuplicatePushSubscriptions(prisma: PrismaClient): Promise<{
  removed: number;
}> {
  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const seenEndpoints = new Set<string>();
  const staleIds: string[] = [];

  for (const sub of subs) {
    if (seenEndpoints.has(sub.endpoint)) {
      staleIds.push(sub.id);
      continue;
    }
    seenEndpoints.add(sub.endpoint);
  }

  if (staleIds.length === 0) return { removed: 0 };

  const result = await prisma.pushSubscription.deleteMany({
    where: { id: { in: staleIds } },
  });
  return { removed: result.count };
}
