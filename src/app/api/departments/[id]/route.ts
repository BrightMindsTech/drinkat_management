import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  try {
    await prisma.department.delete({
      where: { id },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete department' }, { status: 400 });
  }
}

