import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { z } from 'zod';

const createSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  const employeeId = searchParams.get('employeeId');

  if (session.user.role === 'owner') {
    const advances = await prisma.advance.findMany({
      where: {
        ...(branchId ? { employee: { branchId } } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: { employee: { include: { branch: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    return Response.json(advances);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
  if (!user?.employee) return Response.json([]);
  const advances = await prisma.advance.findMany({
    where: { employeeId: user.employee.id },
    include: { employee: { include: { branch: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  return Response.json(advances);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.user.role !== 'staff' && session.user.role !== 'qc')
    return new Response(JSON.stringify({ error: 'Only staff can request advances' }), { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
  if (!user?.employee) return new Response(JSON.stringify({ error: 'Employee record not found' }), { status: 400 });
  if (user.employee.status === 'terminated') return new Response(JSON.stringify({ error: 'Terminated employees cannot request advances' }), { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  if (user.employee.advanceLimit != null) {
    const approvedSum = await prisma.advance.aggregate({
      where: { employeeId: user.employee.id, status: 'approved' },
      _sum: { amount: true },
    });
    const currentTotal = (approvedSum._sum.amount ?? 0) + parsed.data.amount;
    if (currentTotal > user.employee.advanceLimit) {
      return new Response(
        JSON.stringify({
          error: `Advance limit exceeded. Limit: ${user.employee.advanceLimit} JOD, current approved: ${approvedSum._sum.amount ?? 0} JOD`,
        }),
        { status: 400 }
      );
    }
  }

  const advance = await prisma.advance.create({
    data: {
      employeeId: user.employee.id,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      periodMonth: parsed.data.periodMonth ?? null,
    },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(advance);
}
