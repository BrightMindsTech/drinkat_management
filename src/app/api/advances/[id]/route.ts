import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const advance = await prisma.advance.findUnique({ where: { id } });
  if (!advance) return new Response(null, { status: 404 });
  if (advance.status !== 'pending') return Response.json({ error: 'Advance already decided' }, { status: 400 });

  const updated = await prisma.advance.update({
    where: { id },
    data: { status: parsed.data.status as 'approved' | 'denied', decidedAt: new Date() },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(updated);
}
