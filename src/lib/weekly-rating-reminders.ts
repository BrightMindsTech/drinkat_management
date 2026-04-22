import { prisma } from '@/lib/prisma';
import { getExpectedRatingTargetIds, getObligationWeekStartKey, rolesSubjectToWeeklyRating } from '@/lib/weekly-ratings';
import { normalizeUserRole } from '@/lib/formVisibility';
import { sendPushToUser } from '@/lib/push';

/**
 * Sends weekly rating reminders once per due week to users
 * who still have pending weekly ratings.
 */
export async function sendWeeklyRatingRemindersIfDue(): Promise<{ sentUsers: number; weekKey: string; skipped: boolean }> {
  const weekKey = getObligationWeekStartKey();
  const watermarkKey = `weekly_rating_reminder:${weekKey}`;
  const existing = await prisma.appCronWatermark.findUnique({ where: { key: watermarkKey } });
  if (existing) {
    return { sentUsers: 0, weekKey, skipped: true };
  }

  const users = await prisma.user.findMany({
    select: { id: true, role: true, employee: { select: { id: true, name: true } } },
  });

  let sentUsers = 0;
  for (const u of users) {
    const role = normalizeUserRole(u.role);
    if (!rolesSubjectToWeeklyRating(role) || !u.employee) continue;

    const expectedTargetIds = await getExpectedRatingTargetIds(prisma, u.employee.id, role);
    if (expectedTargetIds.length === 0) continue;

    const doneRows = await prisma.weeklyRating.findMany({
      where: {
        raterEmployeeId: u.employee.id,
        weekStartKey: weekKey,
        targetEmployeeId: { in: expectedTargetIds },
      },
      select: { targetEmployeeId: true },
    });
    const done = new Set(doneRows.map((r) => r.targetEmployeeId));
    const remaining = expectedTargetIds.filter((id) => !done.has(id)).length;
    if (remaining <= 0) continue;

    const subs = await prisma.pushSubscription.findMany({ where: { userId: u.id } });
    if (subs.length === 0) continue;
    await sendPushToUser(u.id, subs, {
      title: 'Weekly rating reminder',
      body: `You still have ${remaining} weekly rating${remaining === 1 ? '' : 's'} to submit.`,
      data: {
        type: 'weekly_rating_reminder',
        url: '/dashboard/ratings',
        weekStartKey: weekKey,
      },
    });
    sentUsers += 1;
  }

  await prisma.appCronWatermark.upsert({
    where: { key: watermarkKey },
    create: { key: watermarkKey, lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });

  return { sentUsers, weekKey, skipped: false };
}
