import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  createInboxForUsers,
  getActiveAwaySession,
  getManagerUserIdForEmployee,
  getOpenClockEntry,
  getOwnerUserIds,
  getTimeClockEmployee,
} from '@/lib/time-clock-helpers';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { sendPushToUser } from '@/lib/push';

function minutesForKind(kind: string): number {
  if (kind === 'break') return 30;
  if (kind === 'bathroom' || kind === 'other') return 10;
  return 10;
}

const startSchema = z.object({
  kind: z.enum(['break', 'bathroom', 'other']),
  otherNote: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/away: failed to process expired away sessions', e);
  }

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Time clock does not apply' }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = startSchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  if (parsed.data.kind === 'other' && !parsed.data.otherNote?.trim()) {
    return Response.json({ error: 'otherNote required for "other"' }, { status: 400 });
  }

  const open = await getOpenClockEntry(emp.id);
  if (!open) {
    return Response.json({ error: 'Must be clocked in to start an away timer' }, { status: 400 });
  }

  const existingAway = await getActiveAwaySession(emp.id);
  if (existingAway) {
    return Response.json({ error: 'An away timer is already active' }, { status: 400 });
  }

  const mins = minutesForKind(parsed.data.kind);
  const endsAt = new Date(Date.now() + mins * 60 * 1000);

  const away = await prisma.awaySession.create({
    data: {
      id: crypto.randomUUID(),
      employeeId: emp.id,
      branchId: emp.branchId,
      kind: parsed.data.kind,
      otherNote: parsed.data.otherNote?.trim() ?? null,
      endsAt,
    },
  });

  const managerId = await getManagerUserIdForEmployee({
    reportsToEmployeeId: emp.reportsToEmployeeId,
    branchId: emp.branchId,
  });
  const ownerIds = await getOwnerUserIds();
  const targets = [...new Set([...(managerId ? [managerId] : []), ...ownerIds])];
  if (targets.length > 0) {
    const mins = minutesForKind(parsed.data.kind);
    await createInboxForUsers(targets, {
      category: 'time_clock',
      title: 'Employee left branch',
      body: `${emp.name} selected "${parsed.data.kind}" and has ${mins} minutes before auto report.`,
      dataJson: JSON.stringify({ employeeId: emp.id, awaySessionId: away.id, kind: parsed.data.kind }),
    });
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: targets } } });
    for (const uid of targets) {
      const userSubs = subs.filter((s) => s.userId === uid);
      await sendPushToUser(uid, userSubs, {
        title: 'Employee left branch',
        body: `${emp.name}: ${parsed.data.kind} (${mins} min).`,
        data: { type: 'time_clock_away_started' },
      });
    }
  }

  return Response.json({
    ok: true,
    away: {
      id: away.id,
      kind: away.kind,
      endsAt: away.endsAt.toISOString(),
    },
  });
}
