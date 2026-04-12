import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } }, assignments: { include: { employee: true, branch: true } } },
  });
  if (!checklist) return new Response(null, { status: 404 });
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return new Response(null, { status: 403 });
    if (checklist.branchId && checklist.branchId !== user.employee.branchId) return new Response(null, { status: 403 });
  }
  return Response.json(checklist);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  branchId: z.string().nullable().optional(),
  repeatsDaily: z.boolean().optional(),
  deadlineTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const managerBranchId = user.employee.branchId;
    const existing = await prisma.checklist.findUnique({ where: { id } });
    if (!existing) return new Response(null, { status: 404 });
    if (existing.branchId && existing.branchId !== managerBranchId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (parsed.data.branchId && parsed.data.branchId !== managerBranchId) {
      return Response.json({ error: 'Managers can only use their own branch' }, { status: 403 });
    }
  }

  const checklist = await prisma.checklist.update({
    where: { id },
    data: parsed.data,
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
  });
  return Response.json(checklist);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return new Response(null, { status: 403 });
    const existing = await prisma.checklist.findUnique({ where: { id } });
    if (!existing) return new Response(null, { status: 404 });
    if (existing.branchId && existing.branchId !== user.employee.branchId) return new Response(null, { status: 403 });
  }
  await prisma.checklist.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
