import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const { id } = await params;
  const checklist = await prisma.checklist.findUnique({
    where: { id },
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } }, assignments: { include: { employee: true, branch: true } } },
  });
  if (!checklist) return new Response(null, { status: 404 });
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
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const checklist = await prisma.checklist.update({
    where: { id },
    data: parsed.data,
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
  });
  return Response.json(checklist);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const { id } = await params;
  await prisma.checklist.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
