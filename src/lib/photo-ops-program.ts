import type { PrismaClient } from '@prisma/client';
import {
  PHOTO_360_OFFICIAL_WINDOWS,
  PHOTO_SATURDAY_WEEKDAY,
  isSaturdayOnlyPhotoCode,
  photoScheduleDaysJson,
} from '@/lib/photo-official-windows';
import { employeeEligibleForDefaultPhotoOps } from '@/lib/photo-eligibility';
import { photoWeekday } from '@/lib/photo-time';
import { generatePhotoTasksForEmployee } from '@/lib/photo-generate';

const FULL_TIME_PHOTO_ENABLE_BATCH = 8;

/** Approved (non-provisional) catalog types become the live photo program. */
export async function approvedPhotoTypes(prisma: PrismaClient) {
  return prisma.photoCheckType.findMany({
    where: { provisional: false },
    select: { id: true, code: true },
    orderBy: { sortOrder: 'asc' },
  });
}

/**
 * Idempotent: activate approved types and ensure official Asia/Amman windows exist.
 * Daily types use morning / midday / night every day.
 * Kitchen + slush deep-clean types run Saturday only.
 */
export async function ensureOfficialPhotoProgram(prisma: PrismaClient): Promise<{ types: number; schedules: number }> {
  const types = await approvedPhotoTypes(prisma);
  if (types.length) {
    await prisma.photoCheckType.updateMany({
      where: { id: { in: types.map((t) => t.id) } },
      data: { active: true },
    });
  }

  const existing = await prisma.photoCheckSchedule.findMany({
    where: { employeeId: null },
    select: { typeId: true, slotKey: true },
  });
  const have = new Set(existing.map((s) => `${s.typeId}:${s.slotKey}`));
  const toCreate: {
    id: string;
    typeId: string;
    daysOfWeekJson: string;
    slotKey: string;
    slotLabelEn: string;
    slotLabelAr: string;
    startTime: string;
    dueTime: string;
    reminderMinutesBefore: number;
    overdueReminderMinutes: number;
    maxReminders: number;
    reminderCooldownMinutes: number;
    active: boolean;
  }[] = [];

  for (const type of types) {
    const daysOfWeekJson = photoScheduleDaysJson(type.code);
    for (const w of PHOTO_360_OFFICIAL_WINDOWS) {
      if (have.has(`${type.id}:${w.slotKey}`)) continue;
      toCreate.push({
        id: `pcs-${type.code}-${w.slotKey}`,
        typeId: type.id,
        daysOfWeekJson,
        slotKey: w.slotKey,
        slotLabelEn: w.slotLabelEn,
        slotLabelAr: w.slotLabelAr,
        startTime: w.startTime,
        dueTime: w.dueTime,
        reminderMinutesBefore: 30,
        overdueReminderMinutes: 30,
        maxReminders: 24,
        reminderCooldownMinutes: 30,
        active: true,
      });
    }
  }
  if (toCreate.length) {
    await prisma.photoCheckSchedule.createMany({ data: toCreate });
  }
  const created = toCreate.length;

  if (types.length) {
    for (const type of types) {
      const daysOfWeekJson = photoScheduleDaysJson(type.code);
      for (const w of PHOTO_360_OFFICIAL_WINDOWS) {
        await prisma.photoCheckSchedule.updateMany({
          where: {
            employeeId: null,
            typeId: type.id,
            slotKey: w.slotKey,
          },
          data: {
            startTime: w.startTime,
            dueTime: w.dueTime,
            slotLabelEn: w.slotLabelEn,
            slotLabelAr: w.slotLabelAr,
            daysOfWeekJson,
            active: true,
          },
        });
      }
    }
    await prisma.photoCheckSchedule.updateMany({
      where: { employeeId: null, slotKey: 'daily', active: true },
      data: { active: false },
    });
    await cancelOffSaturdayWeeklyPhotoTasks(prisma, types);
  }

  await enableFullTimePhotoOps(prisma);

  return { types: types.length, schedules: existing.length + created };
}

async function cancelOffSaturdayWeeklyPhotoTasks(
  prisma: PrismaClient,
  types: { id: string; code: string }[]
): Promise<void> {
  const weeklyIds = types.filter((t) => isSaturdayOnlyPhotoCode(t.code)).map((t) => t.id);
  if (!weeklyIds.length) return;
  const open = await prisma.photoCheckTask.findMany({
    where: {
      typeId: { in: weeklyIds },
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
    },
    select: { id: true, periodKey: true },
  });
  const ids = open.filter((row) => photoWeekday(row.periodKey) !== PHOTO_SATURDAY_WEEKDAY).map((row) => row.id);
  if (!ids.length) return;
  await prisma.photoCheckTask.updateMany({
    where: { id: { in: ids } },
    data: { status: 'cancelled', excusedReason: 'weekly_saturday_only' },
  });
}

export async function enableFullTimePhotoOps(
  prisma: PrismaClient,
  limit = FULL_TIME_PHOTO_ENABLE_BATCH
): Promise<{ enabled: number }> {
  const candidates = await prisma.employee.findMany({
    where: {
      status: { not: 'terminated' },
      employmentType: { not: 'part_time' },
      OR: [{ photoCheckSetting: null }, { photoCheckSetting: { required: false } }],
    },
    select: { id: true, role: true, status: true, employmentType: true },
    take: Math.max(limit * 4, 24),
  });
  let enabled = 0;
  for (const emp of candidates) {
    if (enabled >= limit) break;
    if (!employeeEligibleForDefaultPhotoOps(emp)) continue;
    await prisma.photoCheckEmployeeSetting.upsert({
      where: { employeeId: emp.id },
      update: { required: true },
      create: { employeeId: emp.id, required: true },
    });
    await assignApprovedPhotoTypes(prisma, emp.id);
    await generatePhotoTasksForEmployee(prisma, emp.id);
    enabled += 1;
  }
  return { enabled };
}

export async function ensureEmployeePhotoEligibility(
  prisma: PrismaClient,
  employee: { id: string; status: string; role: string; employmentType: string }
): Promise<boolean> {
  if (!employeeEligibleForDefaultPhotoOps(employee)) {
    const row = await prisma.photoCheckEmployeeSetting.findUnique({
      where: { employeeId: employee.id },
      select: { required: true },
    });
    return row?.required === true;
  }
  const row = await prisma.photoCheckEmployeeSetting.findUnique({
    where: { employeeId: employee.id },
    select: { required: true },
  });
  if (row?.required) return true;
  await prisma.photoCheckEmployeeSetting.upsert({
    where: { employeeId: employee.id },
    update: { required: true },
    create: { employeeId: employee.id, required: true },
  });
  await assignApprovedPhotoTypes(prisma, employee.id);
  await generatePhotoTasksForEmployee(prisma, employee.id);
  return true;
}

export async function assignApprovedPhotoTypes(prisma: PrismaClient, employeeId: string) {
  const types = await approvedPhotoTypes(prisma);
  await prisma.photoCheckEmployeeType.deleteMany({ where: { employeeId } });
  if (!types.length) return [];
  await prisma.photoCheckEmployeeType.createMany({
    data: types.map((t) => ({
      id: globalThis.crypto.randomUUID(),
      employeeId,
      typeId: t.id,
      assigned: true,
    })),
  });
  return types;
}
