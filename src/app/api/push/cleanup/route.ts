import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { pruneDuplicatePushSubscriptions } from '@/lib/push-subscription-maintenance';
import { withApiErrors } from '@/lib/api-route-error';

/** Remove duplicate rows that share the same push endpoint (owner maintenance). */
export const POST = withApiErrors(async function POST() {
  await requireOwner();
  const before = await prisma.pushSubscription.count();
  const { removed } = await pruneDuplicatePushSubscriptions(prisma);
  const after = await prisma.pushSubscription.count();
  const pushUserRows = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });

  return Response.json({
    ok: true,
    removed,
    subscriptionsBefore: before,
    subscriptionsAfter: after,
    pushUserCount: pushUserRows.length,
  });
});
