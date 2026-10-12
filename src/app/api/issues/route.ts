import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role === 'staff' || role === 'marketing') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const branchIdParam = url.searchParams.get('branchId');

  const where: {
    status?: string;
    branchId?: string;
    assigneeEmployeeId?: string;
  } = {};
  if (status) where.status = status;

  if (role === 'owner' || role === 'qc') {
    if (branchIdParam) where.branchId = branchIdParam;
  } else if (role === 'manager') {
    if (!user?.employee) return Response.json([]);
    where.branchId = user.employee.branchId;
  } else if (role === 'assistant_manager') {
    if (!hasCapability(role, 'issues:update') || !user?.employee) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    where.branchId = user.employee.branchId;
  } else {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const issues = await prisma.issue.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      assignee: { select: { name: true } },
      events: { orderBy: { createdAt: 'desc' }, take: 8 },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return Response.json(issues);
});
