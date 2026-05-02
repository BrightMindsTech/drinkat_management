import type { PrismaClient, Prisma } from '@prisma/client';

export const ANNUAL_LEAVE_DAYS_PER_YEAR = 14;

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function startOfYear(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function eachCalendarDayInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function overlapDaysInYear(start: Date, end: Date, year: number): number {
  const a = start > startOfYear(year) ? start : startOfYear(year);
  const b = end < endOfYear(year) ? end : endOfYear(year);
  if (b < a) return 0;
  return eachCalendarDayInclusive(a, b).length;
}

export function annualLeaveDaysByYear(start: Date, end: Date): Map<number, number> {
  const map = new Map<number, number>();
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    const days = overlapDaysInYear(start, end, year);
    if (days > 0) map.set(year, days);
  }
  return map;
}

export async function approvedAnnualLeaveDaysByYear(
  prisma: PrismaLike,
  employeeId: string,
  years: number[],
  excludeLeaveRequestId?: string
): Promise<Map<number, number>> {
  if (years.length === 0) return new Map();
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const rows = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      type: 'annual',
      status: 'approved',
      ...(excludeLeaveRequestId ? { id: { not: excludeLeaveRequestId } } : {}),
      startDate: { lte: endOfYear(maxYear) },
      endDate: { gte: startOfYear(minYear) },
    },
    select: { startDate: true, endDate: true },
  });

  const map = new Map<number, number>();
  for (const y of years) map.set(y, 0);
  for (const row of rows) {
    for (const y of years) {
      const d = overlapDaysInYear(row.startDate, row.endDate, y);
      if (d > 0) map.set(y, (map.get(y) ?? 0) + d);
    }
  }
  return map;
}

export async function syncEmployeeLeaveBalanceForYear(
  prisma: PrismaLike,
  employeeId: string,
  year: number
): Promise<number> {
  const used = await approvedAnnualLeaveDaysByYear(prisma, employeeId, [year]);
  const usedDays = used.get(year) ?? 0;
  const remaining = Math.max(0, ANNUAL_LEAVE_DAYS_PER_YEAR - usedDays);
  await prisma.employee.update({
    where: { id: employeeId },
    data: { leaveBalanceDays: remaining },
  });
  return remaining;
}
