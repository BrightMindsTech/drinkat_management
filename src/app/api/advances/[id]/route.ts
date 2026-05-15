import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwnerOrManager } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { periodMonthFromDate } from '@/lib/advance-period-month';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerOrManager();
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const advance = await prisma.advance.findUnique({ where: { id }, include: { employee: true } });
  if (!advance) return new Response(null, { status: 404 });
  if (advance.status !== 'pending') return Response.json({ error: 'Advance already decided' }, { status: 400 });

  const role = normalizeUserRole(session.user.role);
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const managerEmployee = user.employee;
    const ok = advance.employee.reportsToEmployeeId === managerEmployee.id;
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const decidedAt = new Date();
  const updateData: {
    status: 'approved' | 'denied';
    decidedAt: Date;
    periodMonth?: string;
  } = {
    status: parsed.data.status,
    decidedAt,
  };
  if (parsed.data.status === 'approved' && !advance.periodMonth) {
    updateData.periodMonth = periodMonthFromDate(advance.requestedAt);
  }

  const updated = await prisma.advance.update({
    where: { id },
    data: updateData,
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(updated);
}
