import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { z } from 'zod';

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['sick', 'annual', 'other']),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();

  if (session.user.role === 'owner') {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        ...(branchId ? { employee: { branchId } } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        employee: { include: { branch: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return Response.json(leaveRequests);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) return Response.json([]);

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { employeeId: user.employee.id },
    include: { employee: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(leaveRequests);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session.user.role !== 'staff' && session.user.role !== 'qc') {
    return new Response(JSON.stringify({ error: 'Only staff can request leave' }), { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) return new Response(JSON.stringify({ error: 'Employee record not found' }), { status: 400 });
  if (user.employee.status === 'terminated') return new Response(JSON.stringify({ error: 'Terminated employees cannot request leave' }), { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate < startDate) return Response.json({ error: 'End date must be after start date' }, { status: 400 });

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: user.employee.id,
      startDate,
      endDate,
      type: parsed.data.type,
      note: parsed.data.note ?? null,
    },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(leaveRequest);
}
