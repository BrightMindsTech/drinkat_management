import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await requireQc();
  const { id: checklistId, itemId } = await params;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, checklistId },
  });
  if (!item) return new Response(null, { status: 404 });

  await prisma.checklistItem.delete({ where: { id: itemId } });
  return new Response(null, { status: 204 });
}
