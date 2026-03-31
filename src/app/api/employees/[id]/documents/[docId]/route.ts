import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  await requireOwner();

  const { id, docId } = await params;

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: docId, employeeId: id },
  });
  if (!doc) return new Response(null, { status: 404 });

  await prisma.employeeDocument.delete({ where: { id: docId } });
  return new Response(null, { status: 204 });
}
