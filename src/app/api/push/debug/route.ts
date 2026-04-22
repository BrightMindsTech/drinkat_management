import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

/**
 * Lightweight diagnostics for current user push registration state.
 * Avoids exposing secrets while confirming env and subscription records.
 */
export async function GET() {
  const session = await requireSession();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    select: { id: true, provider: true, endpoint: true, updatedAt: true, createdAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const safeEndpointPreview = (endpoint: string) => {
    if (endpoint.startsWith('apns:')) {
      const tok = endpoint.slice(5);
      return `apns:${tok.slice(0, 10)}...${tok.slice(-8)}`;
    }
    if (endpoint.startsWith('https://')) return `${endpoint.slice(0, 40)}...`;
    return endpoint.slice(0, 40);
  };

  return Response.json({
    ok: true,
    userId: session.user.id,
    countsByProvider: subs.reduce<Record<string, number>>((acc, s) => {
      acc[s.provider] = (acc[s.provider] ?? 0) + 1;
      return acc;
    }, {}),
    subscriptions: subs.map((s) => ({
      id: s.id,
      provider: s.provider,
      endpointPreview: safeEndpointPreview(s.endpoint),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    apnsConfigPresent: {
      keyId: Boolean(process.env.APNS_KEY_ID),
      teamId: Boolean(process.env.APNS_TEAM_ID),
      privateKey: Boolean(process.env.APNS_PRIVATE_KEY),
      bundleId: process.env.APNS_BUNDLE_ID ?? null,
      useSandbox: process.env.APNS_USE_SANDBOX ?? null,
    },
  });
}
