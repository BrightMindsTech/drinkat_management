import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { z } from 'zod';
import { normalizeUserRole } from '@/lib/formVisibility';

const reviewSchema = z.object({
  status: z.enum(['approved', 'denied']),
  rating: z.number().min(1).max(5).optional(),
  comments: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'qc' && role !== 'owner' && role !== 'manager') return new Response(null, { status: 403 });
  const { id } = await params;
  const submission = await prisma.qcSubmission.findUnique({
    where: { id },
    include: {
      assignment: { include: { checklist: { include: { items: true } }, employee: true, branch: true } },
      employee: { include: { branch: true } },
      photos: true,
    },
  });
  if (!submission) return new Response(null, { status: 404 });

  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return new Response(null, { status: 403 });
    const managerEmployee = user.employee;
    const ok =
      submission.employee.reportsToEmployeeId === managerEmployee.id && submission.branchId === managerEmployee.branchId;
    if (!ok) return new Response(null, { status: 403 });
  }
  return Response.json(submission);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'qc' && role !== 'owner' && role !== 'manager') return new Response(null, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return new Response(null, { status: 403 });
    const managerEmployee = user.employee;

    const submission = await prisma.qcSubmission.findUnique({
      where: { id },
      select: { employeeId: true, branchId: true, employee: { select: { reportsToEmployeeId: true, branchId: true } } },
    });
    if (!submission) return new Response(null, { status: 404 });
    const ok =
      submission.employeeId != null &&
      submission.employee.reportsToEmployeeId === managerEmployee.id &&
      submission.branchId === managerEmployee.branchId;
    if (!ok) return new Response(null, { status: 403 });
  }

  const submission = await prisma.qcSubmission.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rating: parsed.data.rating ?? null,
      comments: parsed.data.comments ?? null,
      reviewedAt: new Date(),
    },
    include: {
      assignment: { include: { checklist: true, employee: true, branch: true } },
      employee: { include: { branch: true } },
      photos: true,
    },
  });
  return Response.json(submission);
}
