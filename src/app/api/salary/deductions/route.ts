import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { runSalaryDistributionIfDue } from '@/lib/salary-distribution';
import { getSalaryDeductionReport } from '@/lib/salary-deduction-report';
import { withApiErrors } from '@/lib/api-route-error';
import { hrOperationsFrozenResponse } from '@/lib/hr-operations-freeze';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  return hrOperationsFrozenResponse();
  await requireOwner();
  await runSalaryDistributionIfDue();
  const { searchParams } = new URL(req.url);
  const periodMonth = searchParams.get('periodMonth');
  const branchId = searchParams.get('branchId') ?? '';

  if (!periodMonth) return Response.json({ error: 'periodMonth required (YYYY-MM)' }, { status: 400 });

  const report = await getSalaryDeductionReport(prisma, periodMonth, branchId);

  const rows = report.rows.map((r) => ({
    employeeName: r.employeeName,
    branchName: r.branchName,
    periodMonth: r.periodMonth,
    salary: r.salary,
    deduction: r.deduction,
    net: r.net,
    employmentType: r.employmentType,
    daysWorked: r.daysWorked,
    dailyRate: r.dailyRate,
  }));

  return Response.json({
    periodMonth: report.periodMonth,
    branchId: branchId || null,
    rows,
    totals: report.totals,
  });
});
