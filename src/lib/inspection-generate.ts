import type { PrismaClient } from '@prisma/client';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { parse } from 'date-fns';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { toInspectionTaskCreateMany } from '@/lib/inspection-schedule';

/** Staging-only activation. Production wrangler.jsonc must not set this. */
export function isInspectionSchedulerEnabled(): boolean {
  return process.env.INSPECTION_SCHEDULER_ENABLED === '1';
}

export function ammanPeriodKey(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

export function dueAtFromDeadline(periodKey: string, deadlineTime: string, timeZone = DEFAULT_APP_TIMEZONE): Date {
  const [hRaw, mRaw] = deadlineTime.split(':');
  const h = Math.min(23, Math.max(0, Number(hRaw) || 0));
  const m = Math.min(59, Math.max(0, Number(mRaw) || 0));
  const s = `${periodKey} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  return fromZonedTime(parse(s, 'yyyy-MM-dd HH:mm:ss', new Date(0)), timeZone);
}

export async function generateInspectionTasksForDay(
  prisma: PrismaClient,
  now = new Date()
): Promise<{ created: number; skipped: number; overdue: number }> {
  if (!isInspectionSchedulerEnabled()) {
    return { created: 0, skipped: 0, overdue: 0 };
  }

  const periodKey = ammanPeriodKey(now);
  const schedules = await prisma.inspectionSchedule.findMany({
    where: { active: true },
    include: { template: { select: { id: true, currentVersionId: true, fieldsJson: true } } },
  });

  const planned: Parameters<typeof toInspectionTaskCreateMany>[0] = [];

  for (const schedule of schedules) {
    const versionId = schedule.templateVersionId ?? schedule.template.currentVersionId;
    if (!versionId) continue;

    const assignees = await resolveAssignees(prisma, schedule);
    const dueAt = dueAtFromDeadline(periodKey, schedule.deadlineTime);
    for (const a of assignees) {
      planned.push({
        scheduleId: schedule.id,
        templateVersionId: versionId,
        assigneeEmployeeId: a.employeeId,
        branchId: a.branchId,
        periodKey,
        dueAt,
      });
    }
  }

  const unique = toInspectionTaskCreateMany(planned);
  let created = 0;
  for (const row of unique) {
    try {
      await prisma.inspectionTask.create({
        data: { ...row, status: 'scheduled' },
      });
      created += 1;
    } catch {
      // Unique (scheduleId, assigneeEmployeeId, periodKey) — safe cron retry.
    }
  }

  const overdue = await prisma.inspectionTask.updateMany({
    where: {
      status: { in: ['scheduled', 'due', 'in_progress'] },
      dueAt: { lt: now },
    },
    data: { status: 'overdue' },
  });

  await prisma.inspectionTask.updateMany({
    where: {
      status: 'scheduled',
      periodKey,
      dueAt: { gte: now },
    },
    data: { status: 'due' },
  });

  return { created, skipped: unique.length - created, overdue: overdue.count };
}

async function resolveAssignees(
  prisma: PrismaClient,
  schedule: {
    employeeId: string | null;
    branchId: string | null;
    role: string | null;
  }
): Promise<{ employeeId: string; branchId: string }[]> {
  if (schedule.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: schedule.employeeId },
      select: { id: true, branchId: true, status: true },
    });
    if (!emp || emp.status === 'terminated') return [];
    return [{ employeeId: emp.id, branchId: emp.branchId }];
  }

  const where: {
    status: { not: string };
    branchId?: string;
    role?: string;
  } = { status: { not: 'terminated' } };
  if (schedule.branchId) where.branchId = schedule.branchId;
  if (schedule.role) where.role = schedule.role;

  const rows = await prisma.employee.findMany({
    where,
    select: { id: true, branchId: true },
  });
  return rows.map((r) => ({ employeeId: r.id, branchId: r.branchId }));
}
