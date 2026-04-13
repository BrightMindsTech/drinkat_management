import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getTimeClockEmployee } from '@/lib/time-clock-helpers';

const webSchema = z.object({
  provider: z.literal('web'),
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const fcmSchema = z.object({
  provider: z.literal('fcm'),
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const session = await requireSession();
  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Not applicable' }, { status: 403 });
  }

  const raw = await req.json();
  const web = webSchema.safeParse(raw);
  const fcm = fcmSchema.safeParse(raw);
  if (!web.success && !fcm.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (web.success) {
    const endpoint = web.data.endpoint;
    const keysJson = JSON.stringify(web.data.keys);
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: session.user.id, endpoint },
      },
      create: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        endpoint,
        keysJson,
        provider: 'web',
      },
      update: { keysJson, updatedAt: new Date() },
    });
    return Response.json({ ok: true });
  }

  const endpoint = `fcm:${fcm.data.token}`;
  await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: session.user.id, endpoint },
    },
    create: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      endpoint,
      keysJson: null,
      provider: 'fcm',
    },
    update: { updatedAt: new Date() },
  });
  return Response.json({ ok: true });
}
