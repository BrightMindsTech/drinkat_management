import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  if (session.user.role === 'owner') {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return new Response(null, { status: 404 });
  } else {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee || user.employee.id !== id) return new Response(null, { status: 403 });
  }

  const salaryCopies = await prisma.salaryCopy.findMany({
    where: { employeeId: id },
    orderBy: { periodMonth: 'desc' },
  });
  return Response.json(salaryCopies);
}
