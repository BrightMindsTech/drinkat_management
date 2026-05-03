import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireQc } from '@/lib/session';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';
import { normalizeUserRole } from '@/lib/formVisibility';
import { z } from 'zod';

const createSchema = z.object({
  checklistId: z.string(),
  employeeId: z.string(),
  branchId: z.string(),
  dueDate: z.string().optional(), // ISO date for non-daily checklists
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const checklistId = searchParams.get('checklistId');

  // Own assignments only (QC reviewers use the global list like owner for review/assignment tools).
  if (role === 'staff' && !(await userHasQcReviewerScope(prisma, session))) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json([]);
    const myId = user.employee.id;
    const assignments = await prisma.checklistAssignment.findMany({
      where: { employeeId: myId },
      include: {
        checklist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
        employee: true,
        branch: true,
      },
    });
    return Response.json(assignments);
  }

  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json([]);
    const managerEmployee = user.employee;
    const assignments = await prisma.checklistAssignment.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(checklistId ? { checklistId } : {}),
        employee: { reportsToEmployeeId: managerEmployee.id },
      },
      include: {
        checklist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
        employee: { include: { branch: true } },
        branch: true,
      },
    });
    return Response.json(assignments);
  }

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      ...(employeeId ? { employeeId } : {}),
      ...(checklistId ? { checklistId } : {}),
    },
    include: {
      checklist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      employee: { include: { branch: true } },
      branch: true,
    },
  });
  return Response.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const checklist = await prisma.checklist.findUnique({ where: { id: parsed.data.checklistId } });
  if (!checklist) return Response.json({ error: 'Checklist not found' }, { status: 404 });
  if (!checklist.repeatsDaily && !parsed.data.dueDate) {
    return Response.json({ error: 'Due date is required for one-time checklists' }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
  if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });
  if (employee.status === 'terminated') return Response.json({ error: 'Cannot assign to terminated employee' }, { status: 400 });

  // Manager: direct reports only; for branch-scoped checklists, assignment branch must match the checklist's branch.
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const managerEmployee = user.employee;
    const okReport = employee.reportsToEmployeeId === managerEmployee.id;
    const okChecklistBranch = !checklist.branchId || checklist.branchId === parsed.data.branchId;
    if (!okReport || !okChecklistBranch) {
      return Response.json(
        {
          error:
            'Managers can only assign to their direct reports. For a branch-specific checklist, pick that branch for the assignment.',
        },
        { status: 403 }
      );
    }
  }

  const assignment = await prisma.checklistAssignment.create({
    data: {
      checklistId: parsed.data.checklistId,
      employeeId: parsed.data.employeeId,
      branchId: parsed.data.branchId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
    include: {
      checklist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      employee: { include: { branch: true } },
      branch: true,
    },
  });
  return Response.json(assignment);
}
