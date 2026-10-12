import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { parseTemplateFields } from '@/lib/formTemplate';
import { ammanPeriodKey } from '@/lib/inspection-generate';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const period = new URL(req.url).searchParams.get('periodKey') ?? ammanPeriodKey();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  const where: {
    periodKey: string;
    assigneeEmployeeId?: string;
    branchId?: string;
  } = { periodKey: period };

  if (hasCapability(role, 'inspections:viewBranch') && role !== 'qc' && role !== 'owner') {
    if (!user?.employee) return Response.json([]);
    where.branchId = user.employee.branchId;
  } else if (role === 'owner' || role === 'qc') {
    const branchId = new URL(req.url).searchParams.get('branchId');
    if (branchId) where.branchId = branchId;
  } else {
    if (!user?.employee) return Response.json([]);
    where.assigneeEmployeeId = user.employee.id;
  }

  const tasks = await prisma.inspectionTask.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      assignee: { select: { name: true } },
      templateVersion: { select: { title: true, category: true, fieldsJson: true, versionNumber: true } },
      schedule: { select: { label: true, window: true, deadlineTime: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return Response.json(
    tasks.map((t) => ({
      ...t,
      fieldCount: parseTemplateFields(t.templateVersion.fieldsJson).length,
    }))
  );
});
