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
import { z } from 'zod';

const patchSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (existing.status !== 'pending') return Response.json({ error: 'Leave request already decided' }, { status: 400 });

  const role = normalizeUserRole(session.user.role);
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const managerEmployee = user.employee;
    const ok =
      existing.employee.reportsToEmployeeId === managerEmployee.id &&
      existing.employee.branchId === managerEmployee.branchId;
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status === 'approved' && existing.type === 'annual') {
        const requestedByYear = annualLeaveDaysByYear(existing.startDate, existing.endDate);
        const years = [...requestedByYear.keys()];
        const approvedByYear = await approvedAnnualLeaveDaysByYear(tx, existing.employeeId, years, existing.id);
        for (const year of years) {
          const requestedDays = requestedByYear.get(year) ?? 0;
          const approvedDays = approvedByYear.get(year) ?? 0;
          const remaining = Math.max(0, ANNUAL_LEAVE_DAYS_PER_YEAR - approvedDays);
          if (requestedDays > remaining) {
            throw new Error(
              JSON.stringify({
                error: `Cannot approve annual leave for ${year}. Remaining: ${remaining} day(s), requested: ${requestedDays} day(s).`,
                code: 'annual_leave_limit_exceeded',
              })
            );
          }
        }
      }

      const leave = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: parsed.data.status,
          decidedAt: new Date(),
        },
        include: { employee: { include: { branch: true } } },
      });
      await syncEmployeeLeaveBalanceForYear(tx, existing.employeeId, new Date().getFullYear());
      return leave;
    });
  } catch (e) {
    if (e instanceof Error) {
      try {
        const parsedErr = JSON.parse(e.message) as { error?: string; code?: string };
        if (parsedErr?.code === 'annual_leave_limit_exceeded') {
          return Response.json(parsedErr, { status: 400 });
        }
      } catch {
        // fall through
      }
    }
    throw e;
  }

  return Response.json(updated);
}
