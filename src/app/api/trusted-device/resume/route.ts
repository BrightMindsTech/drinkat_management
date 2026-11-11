import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withApiErrors } from '@/lib/api-route-error';
import { applySessionCookie } from '@/lib/mint-session-cookie';
import {
  hashTrustedDeviceToken,
  newTrustedDeviceToken,
  trustedDeviceExpired,
} from '@/lib/trusted-device';

const bodySchema = z.object({
  deviceId: z.string().min(8).max(80),
  token: z.string().min(16).max(128),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid device' }, { status: 400 });

  const tokenHash = hashTrustedDeviceToken(parsed.data.token);
  const row = await prisma.trustedDevice.findFirst({
    where: { deviceId: parsed.data.deviceId, tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          branchId: true,
          employee: { select: { status: true } },
          branch: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return Response.json({ error: 'Unknown device' }, { status: 401 });
  if (row.user.employee?.status === 'terminated') {
    await prisma.trustedDevice.deleteMany({ where: { userId: row.userId } });
    return Response.json({ error: 'Unknown device' }, { status: 401 });
  }
  if (trustedDeviceExpired(row.lastUsedAt)) {
    await prisma.trustedDevice.delete({ where: { id: row.id } });
    return Response.json({ error: 'Unknown device' }, { status: 401 });
  }

  const nextRaw = newTrustedDeviceToken();
  await prisma.trustedDevice.update({
    where: { id: row.id },
    data: { tokenHash: hashTrustedDeviceToken(nextRaw), lastUsedAt: new Date() },
  });

  await applySessionCookie({
    id: row.user.id,
    email: row.user.email,
    role: row.user.role,
    branchId: row.user.branchId,
    branchName: row.user.branch?.name,
  });

  return Response.json({ ok: true, token: nextRaw });
});
