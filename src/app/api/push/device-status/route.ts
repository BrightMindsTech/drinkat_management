import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  token: z.string().min(10),
});

/** Whether the signed-in user already has this APNs device token registered. */
export async function POST(req: Request) {
  const session = await requireSession();
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const endpoint = `apns:${parsed.data.token}`;
  const row = await prisma.pushSubscription.findUnique({
    where: {
      userId_endpoint: { userId: session.user.id, endpoint },
    },
    select: { id: true },
  });

  return Response.json({ registered: Boolean(row) });
}
