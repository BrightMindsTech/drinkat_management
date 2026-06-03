import type { PrismaClient } from '@prisma/client';
import { endOfMonth, endOfDay, format, startOfDay } from 'date-fns';
import { periodMonthFromDate } from '@/lib/advance-period-month';

function formatYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Which payroll month an approved advance deducts from (explicit field, else approval month, else request month). */
export function payrollMonthForAdvance(advance: {
  periodMonth: string | null;
  decidedAt: Date | null;
  requestedAt: Date;
}): string {
  if (advance.periodMonth && /^\d{4}-\d{2}$/.test(advance.periodMonth)) {
    return advance.periodMonth;
  }
  if (advance.decidedAt) return periodMonthFromDate(advance.decidedAt);
  return periodMonthFromDate(advance.requestedAt);
}

function periodMonthDateBounds(periodMonth: string): { start: Date; end: Date } {
  const [y, mo] = periodMonth.split('-').map(Number);
  const monthStart = new Date(y, mo - 1, 1);
  return {
    start: startOfDay(monthStart),
    end: endOfDay(endOfMonth(monthStart)),
  };
}

export type SalaryDeductionRow = {
  periodMonth: string;
  employeeName: string;
  branchName: string;
  employmentType: 'full_time' | 'part_time';
  /** Full-time: gross from permanent `Employee.salaryAmount`. Part-time: days worked × daily rate in that month. */
  salary: number;
  deduction: number;
  net: number;
  /** Part-time only: distinct calendar days with clock-in in this month */
  daysWorked: number | null;
  /** Part-time only: stored rate per day (same field as profile) */
  dailyRate: number | null;
};

/**
 * Payroll rows for a calendar month. Full-time gross uses each employee's permanent `salaryAmount`.
 * Part-time gross uses time-clock days in that month × daily `salaryAmount`. Advance deductions are month-scoped.
 */
export async function getSalaryDeductionReport(
  prisma: PrismaClient,
  periodMonth: string,
  branchId: string
): Promise<{ periodMonth: string; rows: SalaryDeductionRow[]; totals: { salary: number; deduction: number; net: number } }> {
  const { start, end } = periodMonthDateBounds(periodMonth);

  const branchFilter = branchId ? { branchId } : {};

  const [fullTimeEmployees, partTimeEmployees, allApproved] = await Promise.all([
    prisma.employee.findMany({
      where: {
        status: { in: ['active', 'on_leave'] },
        employmentType: { not: 'part_time' },
        ...branchFilter,
      },
      select: {
        id: true,
        name: true,
        salaryAmount: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.employee.findMany({
      where: {
        status: { in: ['active', 'on_leave'] },
        employmentType: 'part_time',
        ...branchFilter,
      },
      select: {
        id: true,
        name: true,
        salaryAmount: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.advance.findMany({
      where: {
        status: 'approved',
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: { employeeId: true, amount: true, periodMonth: true, requestedAt: true, decidedAt: true },
    }),
  ]);

  const deductionByEmployee = new Map<string, number>();
  for (const a of allApproved) {
    if (payrollMonthForAdvance(a) !== periodMonth) continue;
    deductionByEmployee.set(a.employeeId, (deductionByEmployee.get(a.employeeId) ?? 0) + a.amount);
  }

  const ptIds = partTimeEmployees.map((e) => e.id);
  const ptEntries =
    ptIds.length === 0
      ? []
      : await prisma.timeClockEntry.findMany({
          where: {
            employeeId: { in: ptIds },
            clockInAt: { gte: start, lte: end },
          },
          select: { employeeId: true, clockInAt: true },
        });

  const daysByEmployee = new Map<string, Set<string>>();
  for (const e of ptEntries) {
    const day = formatYmd(new Date(e.clockInAt));
    let set = daysByEmployee.get(e.employeeId);
    if (!set) {
      set = new Set();
      daysByEmployee.set(e.employeeId, set);
    }
    set.add(day);
  }

  const rows: SalaryDeductionRow[] = [];

  for (const emp of fullTimeEmployees) {
    const gross = emp.salaryAmount ?? 0;
    const deduction = deductionByEmployee.get(emp.id) ?? 0;
    rows.push({
      periodMonth,
      employeeName: emp.name,
      branchName: emp.branch.name,
      employmentType: 'full_time',
      salary: gross,
      deduction,
      net: Math.max(0, gross - deduction),
      daysWorked: null,
      dailyRate: null,
    });
  }

  for (const emp of partTimeEmployees) {
    const days = daysByEmployee.get(emp.id)?.size ?? 0;
    const daily = emp.salaryAmount ?? 0;
    const gross = Math.round(days * daily * 100) / 100;
    const deduction = deductionByEmployee.get(emp.id) ?? 0;
    rows.push({
      periodMonth,
      employeeName: emp.name,
      branchName: emp.branch.name,
      employmentType: 'part_time',
      salary: gross,
      deduction,
      net: Math.max(0, gross - deduction),
      daysWorked: days,
      dailyRate: daily,
    });
  }

  rows.sort((a, b) => a.branchName.localeCompare(b.branchName) || a.employeeName.localeCompare(b.employeeName));

  const totals = rows.reduce(
    (acc, r) => ({
      salary: acc.salary + r.salary,
      deduction: acc.deduction + r.deduction,
      net: acc.net + r.net,
    }),
    { salary: 0, deduction: 0, net: 0 }
  );

  return { periodMonth, rows, totals };
}
