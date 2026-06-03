import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwnerOrManager } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import {
  ANNUAL_LEAVE_DAYS_PER_YEAR,
  annualLeaveDaysByYear,
  approvedAnnualLeaveDaysByYear,
  syncEmployeeLeaveBalanceForYear,
} from '@/lib/leave-balance';
import { getUserIdForEmployeeId } from '@/lib/employee-user';
import { notifyUser } from '@/lib/user-notify';
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireOwnerOrManager();

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

    const { id } = await params;
    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!existing) return new Response(null, { status: 404 });
    if (existing.status !== 'pending') {
      return Response.json({ error: 'Leave request already decided' }, { status: 400 });
    }

    const role = normalizeUserRole(session.user.role);
    if (role === 'manager') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { employee: true },
      });
      if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const managerEmployee = user.employee;
      const ok = existing.employee.reportsToEmployeeId === managerEmployee.id;
      if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // D1: interactive `$transaction` is unreliable on Workers — use sequential writes (see ratings/weekly).
    if (parsed.data.status === 'approved' && existing.type === 'annual') {
      const requestedByYear = annualLeaveDaysByYear(existing.startDate, existing.endDate);
      const years = [...requestedByYear.keys()];
      const approvedByYear = await approvedAnnualLeaveDaysByYear(
        prisma,
        existing.employeeId,
        years,
        existing.id
      );
      for (const year of years) {
        const requestedDays = requestedByYear.get(year) ?? 0;
        const approvedDays = approvedByYear.get(year) ?? 0;
        const remaining = Math.max(0, ANNUAL_LEAVE_DAYS_PER_YEAR - approvedDays);
        if (requestedDays > remaining) {
          return Response.json(
            {
              error: `Cannot approve annual leave for ${year}. Remaining: ${remaining} day(s), requested: ${requestedDays} day(s).`,
              code: 'annual_leave_limit_exceeded',
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        decidedAt: new Date(),
      },
      include: { employee: { include: { branch: true } } },
    });

    await syncEmployeeLeaveBalanceForYear(prisma, existing.employeeId, new Date().getFullYear());

    const employeeUserId = await getUserIdForEmployeeId(existing.employeeId);
    if (employeeUserId) {
      const href = '/dashboard/hr';
      const statusLabel = parsed.data.status;
      const title = `Leave request ${statusLabel}`;
      const body = `Your ${existing.type} leave request was ${statusLabel}.`;
      await notifyUser(prisma, employeeUserId, {
        category: 'leave_decision',
        title,
        body,
        dataJson: JSON.stringify({
          type: 'leave_request_decided',
          leaveRequestId: id,
          status: statusLabel,
          href,
        }),
        push: {
          title,
          body,
          data: { type: 'leave_request_decided', url: href, leaveRequestId: id },
        },
      });
    }

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[PATCH /api/leave/[id]]', e);
    return Response.json(
      { error: e instanceof Error ? e.message : 'Failed to update leave request' },
      { status: 500 }
    );
  }
}
