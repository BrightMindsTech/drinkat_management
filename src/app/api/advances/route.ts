import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { getManagerUserIdForEmployee } from '@/lib/notify-helpers';
import { notifyOwnersAndManager } from '@/lib/user-notify';
import { normalizeUserRole } from '@/lib/formVisibility';
import { currentAdvancePeriodMonth } from '@/lib/advance-period-month';
import { withPrismaRetry } from '@/lib/prisma-retry';
import { z } from 'zod';

const RECENT_REQUEST_WINDOW_MS = 5 * 60 * 1000;

const createSchema = z.object({
  amount: z.number().positive(),
  note: z.string().optional(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');
  const employeeId = searchParams.get('employeeId');
  const team = searchParams.get('team') === '1';

  if (role === 'owner') {
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

  if (role === 'manager' && team) {
    const teamAdvances = await prisma.advance.findMany({
      where: {
        employee: { reportsToEmployeeId: user.employee.id },
      },
      include: { employee: { include: { branch: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    return Response.json(teamAdvances);
  }

  const advances = await prisma.advance.findMany({
    where: { employeeId: user.employee.id },
    include: { employee: { include: { branch: true } } },
    orderBy: { requestedAt: 'desc' },
  });
  return Response.json(advances);
}

export async function POST(req: NextRequest) {
  try {
  const session = await requireSession();
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

  const periodMonth = parsed.data.periodMonth ?? currentAdvancePeriodMonth();
  const recentCutoff = new Date(Date.now() - RECENT_REQUEST_WINDOW_MS);
  const advance = await withPrismaRetry(async () => {
    const duplicate = await prisma.advance.findFirst({
      where: {
        employeeId: user.employee!.id,
        amount: parsed.data.amount,
        periodMonth,
        status: 'pending',
        createdAt: { gte: recentCutoff },
      },
      include: { employee: { include: { branch: true } } },
    });
    if (duplicate) return duplicate;

    return prisma.advance.create({
      data: {
        employeeId: user.employee!.id,
        amount: parsed.data.amount,
        note: parsed.data.note ?? null,
        periodMonth,
      },
      include: { employee: { include: { branch: true } } },
    });
  });

  const managerUserId = await getManagerUserIdForEmployee({
    reportsToEmployeeId: user.employee.reportsToEmployeeId,
    branchId: user.employee.branchId,
  });
  const href = '/dashboard/hr#hr-owner-advances';
  const advanceTitle = 'Advance request needs review';
  const advanceBody = `${user.employee.name} requested ${parsed.data.amount.toFixed(2)} JOD.`;
  try {
    await notifyOwnersAndManager(prisma, managerUserId, {
      category: 'advance_review',
      title: advanceTitle,
      body: advanceBody,
      dataJson: JSON.stringify({
        type: 'advance_request_pending_review',
        advanceId: advance.id,
        href,
      }),
      push: {
        title: advanceTitle,
        body: advanceBody,
        data: {
          type: 'advance_request_pending_review',
          url: href,
          advanceId: advance.id,
        },
      },
    });
  } catch (notifyErr) {
    console.error('[advances POST] notify failed (request saved)', notifyErr);
  }

  return Response.json(advance);
  } catch (e) {
    const { apiErrorResponse } = await import('@/lib/api-route-error');
    return apiErrorResponse('advances POST', e, 'Failed to request advance');
  }
}
