import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHrStaffAdmin } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';

export const DELETE = withApiErrors(async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  await requireHrStaffAdmin();

  const { id, docId } = await params;

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: docId, employeeId: id },
  });
  if (!doc) return new Response(null, { status: 404 });

  await prisma.employeeDocument.delete({ where: { id: docId } });
  return new Response(null, { status: 204 });
});
