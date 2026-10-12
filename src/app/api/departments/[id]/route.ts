import { prisma } from '@/lib/prisma';
import { requireHrStaffAdmin } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';

export const DELETE = withApiErrors(async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireHrStaffAdmin();
  const { id } = await params;

  try {
    await prisma.department.delete({
      where: { id },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Failed to delete department' }, { status: 400 });
  }
});

