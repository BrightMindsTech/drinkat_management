import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/formVisibility';
import { createInboxForUsers, getOpenClockEntry, getOwnerUserIds } from '@/lib/time-clock-helpers';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';

const bodySchema = z.object({
  employeeId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'manager') {
    return Response.json({ error: 'Only owner or manager can force clock-out' }, { status: 403 });
  }

  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/force-clock-out: failed to process expired away sessions', e);
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const target = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    select: {
      id: true,
      name: true,
      status: true,
      branchId: true,
      reportsToEmployeeId: true,
    },
  });
  if (!target) return Response.json({ error: 'Employee not found' }, { status: 404 });
  if (target.status === 'terminated') {
    return Response.json({ error: 'Employee is terminated' }, { status: 400 });
  }

  if (role === 'manager') {
    const me = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true, branchId: true },
    });
    if (!me) return Response.json({ error: 'No employee record for manager' }, { status: 403 });
    const okTeam =
      target.reportsToEmployeeId === me.id &&
      target.branchId === me.branchId &&
      (target.status === 'active' || target.status === 'on_leave');
    if (!okTeam) {
      return Response.json({ error: 'You can only force clock-out for your direct reports in your branch' }, { status: 403 });
    }
  }

  const open = await getOpenClockEntry(target.id);
  if (!open) {
    return Response.json({ ok: true, alreadyClockedOut: true });
  }

  const now = new Date();
  const clockReason = role === 'owner' ? 'force_hr_owner' : 'force_hr_manager';

  let reporterDisplay = 'Owner';
  if (role === 'manager') {
    const mgr = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { name: true },
    });
    reporterDisplay = mgr?.name?.trim() || 'Manager';
  }

  const details = `Force clock-out from HR (${reporterDisplay}). Was clocked in since ${open.clockInAt.toISOString()}.`;
  const logId = `force-out-${open.id}-${now.getTime()}`;

  await prisma.$transaction([
    prisma.awaySession.updateMany({
      where: { employeeId: target.id, status: 'active' },
      data: { status: 'canceled' },
    }),
    prisma.timeClockEntry.update({
      where: { id: open.id },
      data: {
        clockOutAt: now,
        clockOutLat: null,
        clockOutLng: null,
        clockOutReason: clockReason,
      },
    }),
  ]);

  const owners = await getOwnerUserIds();
  if (owners.length > 0) {
    await createInboxForUsers(owners, {
      category: 'manager_time_clock_report',
      title: `HR force clock-out: ${target.name}`,
      body: `${target.name} · ${details} · ${now.toISOString()}`,
      dataJson: JSON.stringify({
        source: 'force_clock_out_hr',
        logId,
        employeeId: target.id,
        employeeName: target.name,
        when: now.toISOString(),
        type: 'clock_out',
        details,
        reportedByUserId: session.user.id,
        reporterDisplay,
        reporterRole: role,
      }),
    });
  }

  return Response.json({
    ok: true,
    clockOutAt: now.toISOString(),
  });
}
