import type { PrismaClient } from '@prisma/client';
import { PHOTO_360_OFFICIAL_WINDOWS } from '@/lib/photo-official-windows';

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
 * Every approved type uses morning / midday / night (08:00–13:00 / 14:00–18:00 / 20:00–02:00).
 * Does not invent freezer/holding types or provisional catalog rows.
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
    for (const w of PHOTO_360_OFFICIAL_WINDOWS) {
      if (have.has(`${type.id}:${w.slotKey}`)) continue;
      toCreate.push({
        id: `pcs-${type.code}-${w.slotKey}`,
        typeId: type.id,
        daysOfWeekJson: '[0,1,2,3,4,5,6]',
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
    for (const w of PHOTO_360_OFFICIAL_WINDOWS) {
      await prisma.photoCheckSchedule.updateMany({
        where: {
          employeeId: null,
          typeId: { in: types.map((t) => t.id) },
          slotKey: w.slotKey,
        },
        data: {
          startTime: w.startTime,
          dueTime: w.dueTime,
          slotLabelEn: w.slotLabelEn,
          slotLabelAr: w.slotLabelAr,
          active: true,
        },
      });
    }
    await prisma.photoCheckSchedule.updateMany({
      where: { employeeId: null, slotKey: 'daily', active: true },
      data: { active: false },
    });
  }

  return { types: types.length, schedules: existing.length + created };
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
