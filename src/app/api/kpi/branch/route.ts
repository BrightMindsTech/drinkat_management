import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireKpiRosterViewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { computeAndStoreEmployeeKpi, resolveKpiPeriod } from '@/lib/kpi-compute';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireKpiRosterViewer();
  const role = normalizeUserRole(session.user.role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      hrKpiReviewer: true,
      employee: { select: { branchId: true } },
    },
  });
  const { range, periodKey } = resolveKpiPeriod(
    new URL(req.url).searchParams.get('range') ?? new URL(req.url).searchParams.get('periodKey')
  );
  const branchIdParam = new URL(req.url).searchParams.get('branchId');
  const viewAll = role === 'owner' || role === 'qc' || Boolean(user?.hrKpiReviewer);
  let branchId = branchIdParam;
  if (role === 'manager' && !viewAll) {
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    branchId = user.employee.branchId;
  } else if (!viewAll && !hasCapability(role, 'kpi:viewBranch')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  } else if (viewAll && !branchIdParam) {
    branchId = undefined;
  }

  const employees = await prisma.employee.findMany({
    where: {
      status: { not: 'terminated' },
      ...(branchId ? { branchId } : {}),
      role: { in: ['staff', 'assistant_manager', 'manager'] },
    },
    select: { id: true, name: true, role: true, branchId: true, branch: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const scores = [];
  for (const emp of employees) {
    const explanation = await computeAndStoreEmployeeKpi(prisma, emp.id, periodKey);
    scores.push({
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      branchId: emp.branchId,
      branchName: emp.branch.name,
      ...explanation,
    });
  }
  return Response.json({
    range,
    periodKey,
    mode: 'operational',
    purpose: 'operational_hr_review_only',
    employmentDecisionUse: false,
    officialPublicationAllowed: false,
    scores,
  });
});
