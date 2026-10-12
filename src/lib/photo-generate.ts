import type { PrismaClient } from '@prisma/client';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  parsePhotoDaysOfWeek,
  photoPeriodKey,
  photoWeekday,
  photoWindowInstants,
  shiftPhotoPeriodKey,
} from '@/lib/photo-time';
import { BRANCH_PHOTO_CLAIMED, listClaimedPhotoWindows, photoBranchWindowKey } from '@/lib/photo-branch-claim';

/** D1 createMany bound-parameter ceiling — keep batches small. */
export const PHOTO_TASK_CREATE_BATCH = 12;

export { parsePhotoDaysOfWeek, photoInstantInZone, photoPeriodKey, photoWindowInstants } from '@/lib/photo-time';

export function isPhotoCheckSchedulerEnabled(): boolean {
  let fromCf: string | undefined;
  try {
    const { env } = getCloudflareContext({ async: false }) as {
      env?: { PHOTO_CHECK_SCHEDULER_ENABLED?: string };
    };
    fromCf = env?.PHOTO_CHECK_SCHEDULER_ENABLED;
  } catch {
    fromCf = undefined;
  }
  // Bracket access so Next.js does not inline this at build time.
  return (fromCf ?? process.env['PHOTO_CHECK_SCHEDULER_ENABLED']) === '1';
}

/** Re-enable must not backfill occurrences whose due time already passed. */
export function shouldCreatePhotoOccurrence(dueAt: Date, now: Date): boolean {
  return dueAt >= now;
}

export async function generatePhotoCheckTasksForDay(
  prisma: PrismaClient,
  now = new Date(),
  onlyEmployeeId?: string
): Promise<{ created: number; skipped: number; overdue: number }> {
  const todayKey = photoPeriodKey(now);
  const yesterdayKey = shiftPhotoPeriodKey(todayKey, -1);
  const periodKeys = [yesterdayKey, todayKey];
  // Cancelled-but-not-claimed rows occupy the unique (schedule, assignee, period)
  // key and block recreating remaining windows after photo-ops is turned back on.
  await prisma.photoCheckTask.deleteMany({
    where: {
      periodKey: { in: periodKeys },
      status: 'cancelled',
      NOT: { excusedReason: BRANCH_PHOTO_CLAIMED },
      ...(onlyEmployeeId ? { assigneeEmployeeId: onlyEmployeeId } : {}),
    },
  });
  const [schedules, employees, existing] = await Promise.all([
    prisma.photoCheckSchedule.findMany({
      where: { active: true, type: { active: true, provisional: false } },
      select: {
        id: true,
        typeId: true,
        employeeId: true,
        branchId: true,
        role: true,
        daysOfWeekJson: true,
        slotKey: true,
        startTime: true,
        dueTime: true,
      },
    }),
    prisma.employee.findMany({
      where: {
        status: { not: 'terminated' },
        ...(onlyEmployeeId ? { id: onlyEmployeeId } : {}),
        photoCheckSetting: { required: true },
      },
      select: { id: true, branchId: true, role: true },
    }),
    prisma.photoCheckTask.findMany({
      where: { periodKey: { in: periodKeys }, ...(onlyEmployeeId ? { assigneeEmployeeId: onlyEmployeeId } : {}) },
      select: { scheduleId: true, assigneeEmployeeId: true, periodKey: true },
    }),
  ]);

  const empIds = employees.map((e) => e.id);
  const assignments = empIds.length
    ? await prisma.photoCheckEmployeeType.findMany({
        where: { employeeId: { in: empIds }, assigned: true },
        select: { employeeId: true, typeId: true },
      })
    : [];
  const assigned = new Set(assignments.map((a) => `${a.employeeId}:${a.typeId}`));
  const have = new Set(existing.map((t) => `${t.scheduleId}:${t.assigneeEmployeeId}:${t.periodKey}`));
  const claimedByPeriod = new Map<string, Set<string>>();
  for (const periodKey of periodKeys) {
    claimedByPeriod.set(
      periodKey,
      await listClaimedPhotoWindows(prisma, {
        periodKey,
        branchId: onlyEmployeeId ? employees[0]?.branchId : undefined,
      })
    );
  }

  const healedSlots = new Set<string>();
  for (const schedule of schedules) {
    const stamp = `${schedule.slotKey}:${schedule.startTime}:${schedule.dueTime}`;
    if (healedSlots.has(stamp)) continue;
    healedSlots.add(stamp);
    for (const periodKey of periodKeys) {
      const { windowStartAt, dueAt } = photoWindowInstants(periodKey, schedule.startTime, schedule.dueTime);
      await prisma.photoCheckTask.updateMany({
        where: {
          slotKey: schedule.slotKey,
          periodKey,
          status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
          ...(onlyEmployeeId ? { assigneeEmployeeId: onlyEmployeeId } : {}),
        },
        data: { windowStartAt, dueAt },
      });
    }
  }

  const rows: {
    id: string;
    scheduleId: string;
    typeId: string;
    assigneeEmployeeId: string;
    branchId: string;
    periodKey: string;
    slotKey: string;
    windowStartAt: Date;
    dueAt: Date;
    status: string;
  }[] = [];
  let skipped = 0;

  for (const periodKey of periodKeys) {
    const weekday = photoWeekday(periodKey);
    const claimed = claimedByPeriod.get(periodKey) ?? new Set<string>();
    for (const schedule of schedules) {
      const days = parsePhotoDaysOfWeek(schedule.daysOfWeekJson);
      if (days.length > 0 && !days.includes(weekday)) continue;
      const { windowStartAt, dueAt } = photoWindowInstants(periodKey, schedule.startTime, schedule.dueTime);
      if (!shouldCreatePhotoOccurrence(dueAt, now)) {
        skipped += 1;
        continue;
      }
      const status = dueAt <= now ? 'overdue' : windowStartAt <= now ? 'due' : 'scheduled';
      for (const emp of employees) {
        if (schedule.employeeId && schedule.employeeId !== emp.id) continue;
        if (schedule.branchId && schedule.branchId !== emp.branchId) continue;
        if (schedule.role && schedule.role !== emp.role) continue;
        if (!assigned.has(`${emp.id}:${schedule.typeId}`)) continue;
        if (claimed.has(photoBranchWindowKey(emp.branchId, schedule.id))) {
          skipped += 1;
          continue;
        }
        const key = `${schedule.id}:${emp.id}:${periodKey}`;
        if (have.has(key)) {
          skipped += 1;
          continue;
        }
        have.add(key);
        rows.push({
          id: globalThis.crypto.randomUUID(),
          scheduleId: schedule.id,
          typeId: schedule.typeId,
          assigneeEmployeeId: emp.id,
          branchId: emp.branchId,
          periodKey,
          slotKey: schedule.slotKey,
          windowStartAt,
          dueAt,
          status,
        });
      }
    }
  }

  if (rows.length) {
    for (let i = 0; i < rows.length; i += PHOTO_TASK_CREATE_BATCH) {
      await prisma.photoCheckTask.createMany({ data: rows.slice(i, i + PHOTO_TASK_CREATE_BATCH) });
    }
  }

  const overdue = await prisma.photoCheckTask.updateMany({
    where: {
      status: { in: ['scheduled', 'due', 'in_progress'] },
      dueAt: { lt: now },
    },
    data: { status: 'overdue' },
  });

  await prisma.photoCheckTask.updateMany({
    where: {
      status: { in: ['scheduled', 'overdue'] },
      windowStartAt: { lte: now },
      dueAt: { gte: now },
    },
    data: { status: 'due' },
  });

  return { created: rows.length, skipped, overdue: overdue.count };
}

/** Used when Owner/HR turns one person ON. Remaining windows today only; no backfill. */
export async function generatePhotoTasksForEmployee(
  prisma: PrismaClient,
  employeeId: string,
  now = new Date()
): Promise<{ created: number; skipped: number }> {
  const r = await generatePhotoCheckTasksForDay(prisma, now, employeeId);
  return { created: r.created, skipped: r.skipped };
}
