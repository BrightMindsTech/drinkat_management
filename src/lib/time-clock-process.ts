import { prisma } from '@/lib/prisma';
import {
  createInboxForUsers,
  getManagerUserIdForEmployee,
  getOpenClockEntry,
  getOwnerUserIds,
} from '@/lib/time-clock-helpers';
import { sendPushToUser } from '@/lib/push';

/** Process away sessions whose timer passed: auto clock-out + notify managers. */
export async function processExpiredAwaySessions(): Promise<number> {
  const now = new Date();
  const expired = await prisma.awaySession.findMany({
    where: { status: 'active', endsAt: { lt: now } },
    include: { employee: { include: { branch: true } } },
  });
  let n = 0;
  for (const session of expired) {
    const open = await getOpenClockEntry(session.employeeId);
    const ops = [];
    if (open) {
      ops.push(
        prisma.timeClockEntry.update({
          where: { id: open.id },
          data: {
            clockOutAt: now,
            clockOutReason: 'away_timer_expired',
          },
        })
      );
    }
    ops.push(
      prisma.awaySession.update({
        where: { id: session.id },
        data: { status: 'expired_processed' },
      })
    );
    await prisma.$transaction(ops);
    n += 1;

    const mgrId = await getManagerUserIdForEmployee(session.employee);
    const owners = await getOwnerUserIds();
    const targets = [...new Set([...(mgrId ? [mgrId] : []), ...owners])];
    if (targets.length === 0) continue;

    await createInboxForUsers(targets, {
      category: 'time_clock',
      title: 'Away timer expired — auto clock-out',
      body: `${session.employee.name} was automatically clocked out after an away timer expired.`,
      dataJson: JSON.stringify({ employeeId: session.employeeId, awaySessionId: session.id }),
    });

    const allSubs = await prisma.pushSubscription.findMany({
      where: { userId: { in: targets } },
    });
    for (const uid of targets) {
      const subs = allSubs.filter((s) => s.userId === uid);
      await sendPushToUser(uid, subs, {
        title: 'Away timer expired',
        body: `${session.employee.name} was auto clocked out.`,
        data: { type: 'time_clock_away_expired' },
      });
    }
  }
  return n;
}
