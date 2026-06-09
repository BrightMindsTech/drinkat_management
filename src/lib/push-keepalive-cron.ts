import type { PrismaClient } from '@prisma/client';
import { sendApnsBackgroundPush, sendPushToUser } from '@/lib/push';

const WATERMARK_KEY = 'push_keepalive_daily';
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

/**
 * Once per ~20h, send a silent APNs background ping so iOS can wake the app and refresh the device token.
 * Skips users without push consent or without an APNs subscription row.
 */
export async function sendPushKeepaliveIfDue(prisma: PrismaClient): Promise<{
  skipped: boolean;
  usersTargeted: number;
  deliveries: number;
}> {
  const now = new Date();
  const row = await prisma.appCronWatermark.findUnique({ where: { key: WATERMARK_KEY } });
  if (row && now.getTime() - row.lastRunAt.getTime() < MIN_INTERVAL_MS) {
    return { skipped: true, usersTargeted: 0, deliveries: 0 };
  }

  const users = await prisma.user.findMany({
    where: { pushConsentAt: { not: null } },
    select: { id: true },
  });
  if (users.length === 0) {
    await prisma.appCronWatermark.upsert({
      where: { key: WATERMARK_KEY },
      create: { key: WATERMARK_KEY, lastRunAt: now },
      update: { lastRunAt: now },
    });
    return { skipped: false, usersTargeted: 0, deliveries: 0 };
  }

  const userIds = users.map((u) => u.id);
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds }, provider: 'apns' },
  });
  const subsByUser = new Map<string, typeof subs>();
  for (const sub of subs) {
    const list = subsByUser.get(sub.userId) ?? [];
    list.push(sub);
    subsByUser.set(sub.userId, list);
  }

  let deliveries = 0;
  for (const userId of userIds) {
    const userSubs = subsByUser.get(userId);
    if (!userSubs?.length) continue;
    const { delivered } = await sendPushToUser(userId, userSubs, {
      title: '',
      body: '',
      data: { type: 'push_keepalive' },
    });
    deliveries += delivered;
  }

  await prisma.appCronWatermark.upsert({
    where: { key: WATERMARK_KEY },
    create: { key: WATERMARK_KEY, lastRunAt: now },
    update: { lastRunAt: now },
  });

  return { skipped: false, usersTargeted: subsByUser.size, deliveries };
}
