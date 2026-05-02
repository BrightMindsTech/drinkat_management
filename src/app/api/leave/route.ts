import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { createInboxForUsers, getManagerUserIdForEmployee } from '@/lib/time-clock-helpers';
import { sendPushToUser } from '@/lib/push';
import {
  ANNUAL_LEAVE_DAYS_PER_YEAR,
  annualLeaveDaysByYear,
  approvedAnnualLeaveDaysByYear,
  syncEmployeeLeaveBalanceForYear,
} from '@/lib/leave-balance';
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
  if (parsed.data.type === 'annual') {
    const requestedByYear = annualLeaveDaysByYear(startDate, endDate);
    const years = [...requestedByYear.keys()];
    const approvedByYear = await approvedAnnualLeaveDaysByYear(prisma, user.employee.id, years);
    for (const year of years) {
      const requestedDays = requestedByYear.get(year) ?? 0;
      const approvedDays = approvedByYear.get(year) ?? 0;
      const remaining = Math.max(0, ANNUAL_LEAVE_DAYS_PER_YEAR - approvedDays);
      if (requestedDays > remaining) {
        return Response.json(
          {
            error: `Annual leave limit exceeded for ${year}. Remaining: ${remaining} day(s), requested: ${requestedDays} day(s).`,
            code: 'annual_leave_limit_exceeded',
          },
          { status: 400 }
        );
      }
    }
  }

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

  const managerUserId = await getManagerUserIdForEmployee({
    reportsToEmployeeId: user.employee.reportsToEmployeeId,
    branchId: user.employee.branchId,
  });
  if (managerUserId) {
    const href = '/dashboard/hr#hr-owner-leave';
    await createInboxForUsers([managerUserId], {
      category: 'leave_review',
      title: 'Leave request needs review',
      body: `${user.employee.name} requested ${parsed.data.type} leave.`,
      dataJson: JSON.stringify({
        type: 'leave_request_pending_review',
        leaveRequestId: leaveRequest.id,
        href,
      }),
    });
    const subs = await prisma.pushSubscription.findMany({ where: { userId: managerUserId } });
    await sendPushToUser(managerUserId, subs, {
      title: 'Leave request needs review',
      body: `${user.employee.name} requested ${parsed.data.type} leave.`,
      data: {
        type: 'leave_request_pending_review',
        url: href,
        leaveRequestId: leaveRequest.id,
      },
    });
  }

  await syncEmployeeLeaveBalanceForYear(prisma, user.employee.id, new Date().getFullYear());

  return Response.json(leaveRequest);
}
