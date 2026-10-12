import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

const schema = z.object({ answers: z.record(z.unknown()) });

export const PUT = withApiErrors(async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCapability('inspections:run');
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const task = await prisma.inspectionTask.findUnique({ where: { id } });
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 });
  if (task.assigneeEmployeeId !== user?.employee?.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['completed', 'excused', 'cancelled'].includes(task.status)) {
    return Response.json({ error: 'Task already closed' }, { status: 400 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const updated = await prisma.inspectionTask.update({
    where: { id },
    data: { draftJson: JSON.stringify(parsed.data.answers), status: task.status === 'scheduled' ? 'in_progress' : task.status },
  });
  return Response.json({ ok: true, updatedAt: updated.updatedAt });
});
