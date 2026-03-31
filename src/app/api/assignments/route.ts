import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireQc } from '@/lib/session';
import { z } from 'zod';

const createSchema = z.object({
  checklistId: z.string(),
  employeeId: z.string(),
  branchId: z.string(),
  dueDate: z.string().optional(), // ISO date for non-daily checklists
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');
  const checklistId = searchParams.get('checklistId');

  if (session.user.role === 'staff' || session.user.role === 'qc') {
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
