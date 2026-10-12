import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { ammanPeriodKey } from '@/lib/inspection-generate';
import { monthPeriodKey } from '@/lib/kpi-compute';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const period = ammanPeriodKey();
  const month = monthPeriodKey();
  const url = new URL(req.url);
  const wantCsv = url.searchParams.get('format') === 'csv';

  let branchId: string | undefined;
  if (role === 'manager' || role === 'assistant_manager' || role === 'staff') {
    branchId = user?.employee?.branchId ?? undefined;
  }
  if ((role === 'owner' || role === 'qc') && url.searchParams.get('branchId')) {
    branchId = url.searchParams.get('branchId') ?? undefined;
  }

  const taskWhere = {
    periodKey: period,
    ...(branchId ? { branchId } : {}),
    ...(role === 'staff' || role === 'assistant_manager'
      ? { assigneeEmployeeId: user?.employee?.id ?? '__none__' }
      : {}),
  };

  const [tasks, issues, scores] = await Promise.all([
    prisma.inspectionTask.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: true,
    }),
    hasCapability(role, 'issues:update') || role === 'owner' || role === 'qc'
      ? prisma.issue.groupBy({
          by: ['status', 'severity'],
          where: branchId ? { branchId } : {},
          _count: true,
        })
      : Promise.resolve([]),
    hasCapability(role, 'kpi:viewOwn') || hasCapability(role, 'kpi:viewBranch')
      ? prisma.kpiPeriodScore.findMany({
          where: {
            periodKey: month,
            mode: { in: ['operational', 'shadow'] },
            ...(role === 'staff' || role === 'assistant_manager'
              ? { employeeId: user?.employee?.id ?? '__none__' }
              : branchId
                ? { employee: { branchId } }
                : {}),
          },
          include: { employee: { select: { name: true, role: true, branchId: true } } },
        })
      : Promise.resolve([]),
  ]);

  const payload = {
    role,
    day: period,
    month,
    kpiMode: 'operational',
    officialKpiBlocked: false,
    tasks,
    issues,
    kpiScores: scores.map((s) => ({
      name: s.employee.name,
      role: s.employee.role,
      total: s.total,
      mode: s.mode,
    })),
  };

  if (wantCsv) {
    if (!hasCapability(role, 'reports:view') && role !== 'manager' && role !== 'qc') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const lines = ['name,role,kpi_total,mode'];
    for (const row of payload.kpiScores) {
      lines.push(`${JSON.stringify(row.name)},${row.role},${row.total ?? ''},${row.mode}`);
    }
    return new Response(lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    });
  }

  return Response.json(payload);
});
