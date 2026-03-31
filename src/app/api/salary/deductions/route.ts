import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

export async function GET(req: NextRequest) {
  await requireOwner();
  const { searchParams } = new URL(req.url);
  const periodMonth = searchParams.get('periodMonth');
  const branchId = searchParams.get('branchId');

  if (!periodMonth) return Response.json({ error: 'periodMonth required (YYYY-MM)' }, { status: 400 });

  const salaryCopies = await prisma.salaryCopy.findMany({
    where: {
      periodMonth,
      ...(branchId ? { branchId } : {}),
    },
    include: { employee: { include: { branch: true } } },
  });

  const allApproved = await prisma.advance.findMany({
    where: { status: 'approved', periodMonth },
    select: { employeeId: true, amount: true, periodMonth: true },
  });
  const deductionByEmployee = new Map<string, number>();
  for (const a of allApproved) {
    const key = a.employeeId;
    const current = deductionByEmployee.get(key) ?? 0;
    deductionByEmployee.set(key, current + a.amount);
  }
  // For report we show: salary (from copy), total approved advances (to deduct), net = salary - advances
  const byEmployee = new Map<string, { deduction: number }>();
  for (const a of allApproved) {
    const cur = byEmployee.get(a.employeeId) ?? { deduction: 0 };
    cur.deduction += a.amount;
    byEmployee.set(a.employeeId, cur);
  }

  const rows = salaryCopies.map((sc) => {
    const deduction = byEmployee.get(sc.employeeId)?.deduction ?? 0;
    return {
      employeeId: sc.employeeId,
      employeeName: sc.employee.name,
      branchId: sc.branchId,
      branchName: sc.employee.branch.name,
      periodMonth: sc.periodMonth,
      salary: sc.amount,
      deduction,
      net: Math.max(0, sc.amount - deduction),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      salary: acc.salary + r.salary,
      deduction: acc.deduction + r.deduction,
      net: acc.net + r.net,
    }),
    { salary: 0, deduction: 0, net: 0 }
  );

  return Response.json({ periodMonth, branchId: branchId ?? null, rows, totals });
}
