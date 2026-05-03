import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { runSalaryDistributionIfDue } from '@/lib/salary-distribution';
import { z } from 'zod';

const upsertSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(z.object({
    employeeId: z.string(),
    amount: z.number().nonnegative(),
  })),
  source: z.enum(['manual', 'upload']).optional(),
});

export async function GET(req: NextRequest) {
  await requireOwner();
  await runSalaryDistributionIfDue();
  const { searchParams } = new URL(req.url);
  const periodMonth = searchParams.get('periodMonth');
  const branchId = searchParams.get('branchId');

  if (!periodMonth) return Response.json({ error: 'periodMonth required (YYYY-MM)' }, { status: 400 });

  const salaryCopies = await prisma.salaryCopy.findMany({
    where: {
      periodMonth,
      ...(branchId ? { branchId } : {}),
    },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(salaryCopies);
}

export async function POST(req: NextRequest) {
  await requireOwner();
  await runSalaryDistributionIfDue();
  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { periodMonth, entries, source } = parsed.data;
  for (const { employeeId, amount } of entries) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp || emp.employmentType === 'part_time') continue;
    await prisma.salaryCopy.upsert({
      where: {
        employeeId_periodMonth: { employeeId, periodMonth },
      },
      update: { amount, source: source ?? 'manual' },
      create: {
        employeeId,
        branchId: emp.branchId,
        periodMonth,
        amount,
        source: source ?? 'manual',
      },
    });
  }
  const list = await prisma.salaryCopy.findMany({
    where: { periodMonth },
    include: { employee: { include: { branch: true } } },
  });
  return Response.json(list);
}
