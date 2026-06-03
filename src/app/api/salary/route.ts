import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

const upsertSchema = z.object({
  /** Ignored for storage — salaries are permanent on the employee profile. Kept for older clients. */
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  entries: z.array(z.object({
    employeeId: z.string(),
    amount: z.number().nonnegative(),
  })),
  source: z.enum(['manual', 'upload']).optional(),
});

export async function GET(req: NextRequest) {
  await requireOwner();
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  const employees = await prisma.employee.findMany({
    where: {
      status: { in: ['active', 'on_leave'] },
      employmentType: { not: 'part_time' },
      ...(branchId ? { branchId } : {}),
    },
    include: { branch: true },
    orderBy: { name: 'asc' },
  });

  return Response.json(
    employees.map((employee) => ({
      employee,
      amount: employee.salaryAmount ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  await requireOwner();
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { entries } = parsed.data;
  const updatedIds: string[] = [];
  for (const { employeeId, amount } of entries) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp || emp.employmentType === 'part_time') continue;
    await prisma.employee.update({
      where: { id: employeeId },
      data: { salaryAmount: amount },
    });
    updatedIds.push(employeeId);
  }

  const list = await prisma.employee.findMany({
    where: { id: { in: updatedIds } },
    include: { branch: true },
    orderBy: { name: 'asc' },
  });
  return Response.json(
    list.map((employee) => ({
      employee,
      amount: employee.salaryAmount ?? 0,
    }))
  );
}
