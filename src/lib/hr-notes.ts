import type { PrismaClient } from '@prisma/client';
import { computeAndStoreCurrentEmployeeKpis, kpiInstantInPeriod } from '@/lib/kpi-compute';
import { HR_NOTES_KPI_WEIGHT, hrNoteTone, type HrNoteTone } from '@/lib/kpi-engine';

export { HR_NOTES_KPI_WEIGHT, hrNoteTone, type HrNoteTone };

export async function listHrNoteEmployees(prisma: PrismaClient) {
  return prisma.employee.findMany({
    where: { status: { not: 'terminated' } },
    select: {
      id: true,
      name: true,
      role: true,
      branch: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function hrNoteScoresInPeriod(
  prisma: PrismaClient,
  employeeId: string,
  periodKey: string
): Promise<number[]> {
  const notes = await prisma.hrNote.findMany({
    where: { employeeId },
    select: { score: true, createdAt: true },
  });
  return notes.filter((n) => kpiInstantInPeriod(n.createdAt, periodKey)).map((n) => n.score);
}

export async function createHrNote(
  prisma: PrismaClient,
  input: { reviewerId: string; employeeId: string; score: number; reason: string }
) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, status: true, name: true },
  });
  if (!employee || employee.status === 'terminated') return null;

  const note = await prisma.hrNote.create({
    data: {
      id: crypto.randomUUID(),
      employeeId: employee.id,
      reviewerId: input.reviewerId,
      score: input.score,
      reason: input.reason.trim(),
    },
  });
  const kpi = await computeAndStoreCurrentEmployeeKpis(prisma, employee.id);
  return {
    note,
    employeeName: employee.name,
    tone: hrNoteTone(input.score),
    kpi: {
      day: kpi.day.total,
      week: kpi.week.total,
      month: kpi.month.total,
    },
  };
}
