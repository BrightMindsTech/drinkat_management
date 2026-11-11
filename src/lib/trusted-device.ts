import { createHash, randomBytes } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const TRUSTED_DEVICE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

export const TRUSTED_DEVICE_MAX_PER_USER = 8;

export function hashTrustedDeviceToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function newTrustedDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

export function trustedDeviceExpired(lastUsedAt: Date, now = new Date()): boolean {
  return now.getTime() - lastUsedAt.getTime() > TRUSTED_DEVICE_MAX_AGE_SEC * 1000;
}

export async function pruneOldestTrustedDevices(
  prisma: PrismaClient,
  userId: string,
  keep = TRUSTED_DEVICE_MAX_PER_USER
): Promise<void> {
  const rows = await prisma.trustedDevice.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
    select: { id: true },
  });
  const extra = rows.slice(keep).map((r) => r.id);
  if (extra.length) {
    await prisma.trustedDevice.deleteMany({ where: { id: { in: extra } } });
  }
}
