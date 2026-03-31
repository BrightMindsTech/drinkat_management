import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { id } = await params;
  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!existing) return new Response(null, { status: 404 });
  if (existing.status !== 'pending') return Response.json({ error: 'Leave request already decided' }, { status: 400 });

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      decidedAt: new Date(),
    },
    include: { employee: { include: { branch: true } } },
  });

  return Response.json(updated);
}
