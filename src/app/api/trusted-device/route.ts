import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import {
  hashTrustedDeviceToken,
  newTrustedDeviceToken,
  pruneOldestTrustedDevices,
} from '@/lib/trusted-device';

const bodySchema = z.object({
  deviceId: z.string().min(8).max(80),
  token: z.string().max(128).optional(),
  userAgent: z.string().max(180).optional(),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireSession();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid device' }, { status: 400 });

  const raw = newTrustedDeviceToken();
  const tokenHash = hashTrustedDeviceToken(raw);
  const userAgent = parsed.data.userAgent?.trim() || '';

  await prisma.trustedDevice.upsert({
    where: {
      userId_deviceId: { userId: session.user.id, deviceId: parsed.data.deviceId },
    },
    create: {
      userId: session.user.id,
      deviceId: parsed.data.deviceId,
      tokenHash,
      userAgent,
    },
    update: {
      tokenHash,
      userAgent,
      lastUsedAt: new Date(),
    },
  });
  await pruneOldestTrustedDevices(prisma, session.user.id);

  return Response.json({ token: raw, deviceId: parsed.data.deviceId });
});

export const DELETE = withApiErrors(async function DELETE(req: NextRequest) {
  const session = await requireSession();
  const parsed = bodySchema.pick({ deviceId: true }).safeParse(await req.json().catch(() => ({})));
  if (parsed.success) {
    await prisma.trustedDevice.deleteMany({
      where: { userId: session.user.id, deviceId: parsed.data.deviceId },
    });
  } else {
    await prisma.trustedDevice.deleteMany({ where: { userId: session.user.id } });
  }
  return Response.json({ ok: true });
});
