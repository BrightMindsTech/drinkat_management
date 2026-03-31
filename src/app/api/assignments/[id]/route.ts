import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const { id } = await params;
  await prisma.checklistAssignment.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
