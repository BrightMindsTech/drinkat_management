import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { sendPushToSubscription } from '@/lib/push';

/**
 * Debug endpoint: send a test push to current signed-in user.
 * Useful to verify APNs delivery in production quickly.
 */
export async function POST(req: Request) {
  const session = await requireSession();
  const providerFilter = new URL(req.url).searchParams.get('provider');
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
  });
  const selectedSubs =
    providerFilter && providerFilter.length > 0 ? subs.filter((s) => s.provider === providerFilter) : subs;
  if (selectedSubs.length === 0) {
    return Response.json({ ok: false, error: 'No push subscriptions found for this user.' }, { status: 400 });
  }

  const results: { id: string; provider: string; ok: boolean }[] = [];
  for (const sub of selectedSubs) {
    const ok = await sendPushToSubscription(sub, {
      title: 'Push test',
      body: 'If you can read this, push delivery is working.',
      data: {
        type: 'push_test',
        url: '/dashboard/messages',
      },
    });
    results.push({ id: sub.id, provider: sub.provider, ok });
  }

  return Response.json({
    ok: results.some((r) => r.ok),
    count: results.length,
    requestedProvider: providerFilter ?? null,
    allProvidersForUser: [...new Set(subs.map((s) => s.provider))],
    results,
  });
}
