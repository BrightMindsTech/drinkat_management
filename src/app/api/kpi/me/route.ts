import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { computeAndStoreEmployeeKpi, resolveKpiPeriod } from '@/lib/kpi-compute';
import { hasCapability } from '@/lib/permissions';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireCapability('kpi:viewOwn');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { branch: { select: { name: true } } } } },
  });
  if (!user?.employee) return Response.json({ error: 'No employee profile' }, { status: 400 });
  if (!hasCapability(session.user.role, 'kpi:viewOwn') && !hasCapability(session.user.role, 'kpi:viewBranch')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { range, periodKey } = resolveKpiPeriod(
    new URL(req.url).searchParams.get('range') ?? new URL(req.url).searchParams.get('periodKey')
  );
  const explanation = await computeAndStoreEmployeeKpi(prisma, user.employee.id, periodKey);
  return Response.json({
    range,
    periodKey,
    employeeId: user.employee.id,
    name: user.employee.name,
    role: user.employee.role,
    branchName: user.employee.branch.name,
    ...explanation,
  });
});
