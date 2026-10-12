import type { PrismaClient } from '@prisma/client';

export async function employeePhotoRequired(
  prisma: PrismaClient,
  employeeId: string
): Promise<boolean> {
  const row = await prisma.photoCheckEmployeeSetting.findUnique({
    where: { employeeId },
    select: { required: true },
  });
  return row?.required === true;
}

export async function employeeAssignedType(
  prisma: PrismaClient,
  employeeId: string,
  typeId: string
): Promise<boolean> {
  const required = await employeePhotoRequired(prisma, employeeId);
  if (!required) return false;
  const row = await prisma.photoCheckEmployeeType.findUnique({
    where: { employeeId_typeId: { employeeId, typeId } },
    select: { assigned: true },
  });
  return row?.assigned === true;
}

export async function cancelOpenPhotoTasks(
  prisma: PrismaClient,
  employeeId: string,
  reason: string
): Promise<number> {
  const res = await prisma.photoCheckTask.updateMany({
    where: {
      assigneeEmployeeId: employeeId,
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
    },
    data: { status: 'cancelled', excusedReason: reason },
  });
  return res.count;
}

export async function cancelOpenPhotoTasksForType(
  prisma: PrismaClient,
  employeeId: string,
  typeId: string,
  reason: string
): Promise<number> {
  const res = await prisma.photoCheckTask.updateMany({
    where: {
      assigneeEmployeeId: employeeId,
      typeId,
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
    },
    data: { status: 'cancelled', excusedReason: reason },
  });
  return res.count;
}
