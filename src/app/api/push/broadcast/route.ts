import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import {
  getOwnerPushBroadcastAudienceStats,
  getOwnerPushBroadcastCooldownRemainingMs,
  OwnerPushBroadcastCooldownError,
  sendOwnerPushBroadcast,
} from '@/lib/owner-push-broadcast';

const bodySchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(500),
  href: z.string().trim().max(200).optional(),
});

export async function GET() {
  await requireOwner();
  const [audience, cooldownRemainingMs] = await Promise.all([
    getOwnerPushBroadcastAudienceStats(prisma),
    getOwnerPushBroadcastCooldownRemainingMs(prisma),
  ]);
  return Response.json({ ...audience, cooldownRemainingMs });
}

export async function POST(req: Request) {
  await requireOwner();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(parsed.error.flatten(), { status: 400 });
  }

  try {
    const result = await sendOwnerPushBroadcast(prisma, parsed.data);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof OwnerPushBroadcastCooldownError) {
      return Response.json(
        {
          error: 'Please wait before sending another broadcast.',
          cooldownRemainingMs: e.remainingMs,
        },
        { status: 429 }
      );
    }
    console.error('[push/broadcast POST]', e);
    return Response.json({ error: 'Broadcast failed' }, { status: 500 });
  }
}
