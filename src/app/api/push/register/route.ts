import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { sendPushToSubscription } from '@/lib/push';
import { apiErrorResponse } from '@/lib/api-route-error';
import { retryPendingPushForUser } from '@/lib/push-pending-flush';

function schedulePendingPushRetry(userId: string) {
  void retryPendingPushForUser(prisma, userId)
    .then((result) => {
      if (result.backfilled > 0 || result.delivered > 0) {
        console.log('[push/register] retried pending pushes', { userId, ...result });
      }
    })
    .catch((err) => {
      console.error('[push/register] pending push retry failed', { userId, err });
    });
}

async function claimEndpointForUser(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId: { not: userId },
    },
  });
}

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

const apnsSchema = z.object({
  provider: z.literal('apns'),
  token: z.string().min(10),
});

export async function POST(req: Request) {
  try {
  const session = await requireSession();

  const raw = await req.json();
  const web = webSchema.safeParse(raw);
  const fcm = fcmSchema.safeParse(raw);
  const apns = apnsSchema.safeParse(raw);
  if (!web.success && !fcm.success && !apns.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  async function recordPushConsent() {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushConsentAt: new Date() },
    });
  }

  if (web.success) {
    const endpoint = web.data.endpoint;
    const keysJson = JSON.stringify(web.data.keys);
    await claimEndpointForUser(session.user.id, endpoint);
    const existed = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: { userId: session.user.id, endpoint },
      },
      select: { id: true },
    });
    await recordPushConsent();
    const saved = await prisma.pushSubscription.upsert({
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
    if (!existed) {
      void sendPushToSubscription(saved, {
        title: 'Push connected',
        body: 'Your browser push notifications are now connected.',
        data: { type: 'push_connected', url: '/dashboard' },
      }).then((result) => {
        console.log('[push/register] web first-registration self-test', {
          userId: session.user.id,
          subscriptionId: saved.id,
          ok: result === 'ok',
        });
      });
    }
    schedulePendingPushRetry(session.user.id);
    return Response.json({ ok: true });
  }

  if (fcm.success) {
    const endpoint = `fcm:${fcm.data.token}`;
    await claimEndpointForUser(session.user.id, endpoint);
    await recordPushConsent();
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
    schedulePendingPushRetry(session.user.id);
    return Response.json({ ok: true });
  }

  if (apns.success) {
    await recordPushConsent();
    const apnsEndpoint = `apns:${apns.data.token}`;
    await claimEndpointForUser(session.user.id, apnsEndpoint);
    const existed = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: { userId: session.user.id, endpoint: apnsEndpoint },
      },
      select: { id: true },
    });
    const saved = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: session.user.id, endpoint: apnsEndpoint },
      },
      create: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        endpoint: apnsEndpoint,
        keysJson: null,
        provider: 'apns',
      },
      update: { updatedAt: new Date() },
    });

    // One-time self-test when APNs token is first seen for this user on this device.
    if (!existed) {
      void sendPushToSubscription(saved, {
        title: 'Push connected',
        body: 'Your iPhone push notifications are now connected.',
        data: { type: 'push_connected', url: '/dashboard' },
      }).then((result) => {
        console.log('[push/register] apns first-registration self-test', {
          userId: session.user.id,
          subscriptionId: saved.id,
          ok: result === 'ok',
        });
      });
    }
    schedulePendingPushRetry(session.user.id);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Invalid body' }, { status: 400 });
  } catch (e) {
    return apiErrorResponse('push/register POST', e, 'Failed to register push');
  }
}
