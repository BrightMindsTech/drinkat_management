import { prisma } from '@/lib/prisma';

let lastRunMonthUtc: string | null = null;

function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Auto-distribute monthly salaries on/after day 5.
 * Uses Employee.salaryAmount as base and upserts SalaryCopy for current month.
 */
export async function runSalaryDistributionIfDue(now: Date = new Date()) {
  if (now.getUTCDate() < 5) return;

  const periodMonth = monthKeyUtc(now);
  if (lastRunMonthUtc === periodMonth) return;

  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ['active', 'on_leave'] },
      salaryAmount: { not: null },
    },
    select: {
      id: true,
      branchId: true,
      salaryAmount: true,
    },
  });

  await Promise.all(
    employees.map((emp) =>
      prisma.salaryCopy.upsert({
        where: {
          employeeId_periodMonth: {
            employeeId: emp.id,
            periodMonth,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          branchId: emp.branchId,
          periodMonth,
          amount: emp.salaryAmount ?? 0,
          source: 'auto',
        },
      })
    )
  );

  lastRunMonthUtc = periodMonth;
}
