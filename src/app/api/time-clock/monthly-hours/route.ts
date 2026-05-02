import { NextRequest } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { requireOwnerOrManager } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';

function parseMonthParam(monthParam: string | null): Date {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function overlapHours(startA: Date, endA: Date, startB: Date, endB: Date): number {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  if (end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

export async function GET(req: NextRequest) {
  const session = await requireOwnerOrManager();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get('month');
  const branchIdParam = searchParams.get('branchId') ?? '';

  const monthRef = parseMonthParam(monthParam);
  const rangeStart = startOfMonth(monthRef);
  const rangeEnd = endOfMonth(monthRef);

  let employeeWhere: {
    status: { in: ('active' | 'on_leave')[] };
    branchId?: string;
    reportsToEmployeeId?: string;
  } = {
    status: { in: ['active', 'on_leave'] },
  };

  if (role === 'owner') {
    if (branchIdParam) employeeWhere = { ...employeeWhere, branchId: branchIdParam };
  } else {
    const managerUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (!managerUser?.employee) {
      return Response.json({ month: monthParam, start: rangeStart.toISOString(), end: rangeEnd.toISOString(), rows: [] });
    }
    employeeWhere = {
      ...employeeWhere,
      branchId: managerUser.employee.branchId,
      reportsToEmployeeId: managerUser.employee.id,
    };
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: { branch: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  if (employees.length === 0) {
    return Response.json({ month: monthParam, start: rangeStart.toISOString(), end: rangeEnd.toISOString(), rows: [] });
  }

  const employeeIds = employees.map((e) => e.id);
  const entries = await prisma.timeClockEntry.findMany({
    where: {
      employeeId: { in: employeeIds },
      clockInAt: { lte: rangeEnd },
      OR: [{ clockOutAt: null }, { clockOutAt: { gte: rangeStart } }],
    },
    select: {
      employeeId: true,
      clockInAt: true,
      clockOutAt: true,
    },
  });

  const now = new Date();
  const totalsByEmployeeId = new Map<string, { totalHours: number; shiftsCount: number; openShifts: number }>();
  for (const entry of entries) {
    const endedAt = entry.clockOutAt ?? now;
    const hours = overlapHours(entry.clockInAt, endedAt, rangeStart, rangeEnd);
    if (hours <= 0) continue;

    const current = totalsByEmployeeId.get(entry.employeeId) ?? { totalHours: 0, shiftsCount: 0, openShifts: 0 };
    current.totalHours += hours;
    current.shiftsCount += 1;
    if (!entry.clockOutAt) current.openShifts += 1;
    totalsByEmployeeId.set(entry.employeeId, current);
  }

  const rows = employees.map((emp) => {
    const total = totalsByEmployeeId.get(emp.id) ?? { totalHours: 0, shiftsCount: 0, openShifts: 0 };
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      branchName: emp.branch.name,
      employmentType: emp.employmentType,
      totalHours: Math.round(total.totalHours * 100) / 100,
      shiftsCount: total.shiftsCount,
      openShifts: total.openShifts,
    };
  });

  rows.sort((a, b) => b.totalHours - a.totalHours || a.employeeName.localeCompare(b.employeeName));

  return Response.json({
    month: `${monthRef.getFullYear()}-${String(monthRef.getMonth() + 1).padStart(2, '0')}`,
    start: rangeStart.toISOString(),
    end: rangeEnd.toISOString(),
    rows,
  });
}
