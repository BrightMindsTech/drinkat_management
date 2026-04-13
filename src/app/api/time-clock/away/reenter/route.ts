import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getActiveAwaySession, getTimeClockEmployee } from '@/lib/time-clock-helpers';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';

/** Silently cancel active away when employee returns inside geofence (timer cleared). */
export async function POST() {
  const session = await requireSession();
  await processExpiredAwaySessions();

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Time clock does not apply' }, { status: 403 });
  }

  const away = await getActiveAwaySession(emp.id);
  if (!away) {
    return Response.json({ ok: true, canceled: false });
  }

  await prisma.awaySession.update({
    where: { id: away.id },
    data: { status: 'canceled' },
  });

  return Response.json({ ok: true, canceled: true });
}
