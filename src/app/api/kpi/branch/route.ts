import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireKpiRosterViewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import {
  computeAndStoreEmployeeKpi,
  KPI_ROSTER_LIVE_FILL,
  KPI_ROSTER_ROLES,
  KPI_STORE_MODE,
  parseStoredKpiExplanation,
  resolveKpiPeriod,
} from '@/lib/kpi-compute';
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
      role: { in: [...KPI_ROSTER_ROLES] },
    },
    select: { id: true, name: true, role: true, branchId: true, branch: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  const stored = await prisma.kpiPeriodScore.findMany({
    where: {
      periodKey,
      mode: KPI_STORE_MODE,
      employeeId: { in: employees.map((e) => e.id) },
    },
    select: { employeeId: true, total: true, explanationJson: true },
  });
  const storedById = new Map(stored.map((row) => [row.employeeId, row]));

  const missing = employees.filter((emp) => !storedById.has(emp.id));
  for (const emp of missing.slice(0, KPI_ROSTER_LIVE_FILL)) {
    const explanation = await computeAndStoreEmployeeKpi(prisma, emp.id, periodKey);
    storedById.set(emp.id, {
      employeeId: emp.id,
      total: explanation.total,
      explanationJson: JSON.stringify(explanation),
    });
  }

  const scores = employees.map((emp) => {
    const row = storedById.get(emp.id);
    const explanation = row
      ? parseStoredKpiExplanation(row.explanationJson, row.total)
      : {
          mode: KPI_STORE_MODE,
          purpose: 'operational_hr_review_only',
          employmentDecisionUse: false,
          subjectRole: emp.role,
          periodKey,
          officialPublicationAllowed: false,
          officialCyclesCompleted: 0,
          officialWouldBeAllowed: false,
          individualScorePublished: true,
          components: [],
          total: null,
          displayTotal: null,
          usedWeight: 0,
          note: 'Score is updating automatically.',
          aiMustNotCalculate: true,
          storeModeUnused: KPI_STORE_MODE,
        };
    return {
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      branchId: emp.branchId,
      branchName: emp.branch.name,
      ...explanation,
    };
  });
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
