import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

const patchSchema = z.object({
  shiftProfile: z.enum(['default', 'airport']).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await ctx.params;
  const raw = await req.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) {
    return Response.json({ error: 'Branch not found' }, { status: 404 });
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(parsed.data.shiftProfile !== undefined ? { shiftProfile: parsed.data.shiftProfile } : {}),
    },
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    shiftProfile: updated.shiftProfile,
  });
}
