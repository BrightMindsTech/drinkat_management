import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';

export const POST = withApiErrors(async function POST(
  _req: NextRequest,
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
    return Response.json({ error: 'Task is not open' }, { status: 400 });
  }
  const updated = await prisma.inspectionTask.update({
    where: { id },
    data: { status: 'in_progress', startedAt: task.startedAt ?? new Date() },
  });
  return Response.json(updated);
});
