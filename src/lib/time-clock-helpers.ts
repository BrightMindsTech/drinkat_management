import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/formVisibility';
import type { Employee } from '@prisma/client';
import { isInsideBranchRadius } from '@/lib/geo';

export type TimeClockEmployee = Employee & {
  branch: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    geofenceRadiusM: number;
    shiftProfile: string;
  };
  shiftDefinition: { id: string; key: string; startMinute: number; endMinute: number; crossesMidnight: boolean } | null;
};

/** Owner is excluded from time clock entirely. */
export async function getTimeClockEmployee(userId: string, userRole: string): Promise<TimeClockEmployee | null> {
  if (normalizeUserRole(userRole) === 'owner') return null;
  const emp = await prisma.employee.findUnique({
    where: { userId },
    include: {
      branch: true,
      shiftDefinition: true,
    },
  });
  if (!emp || emp.status === 'terminated') return null;
  return emp as TimeClockEmployee;
}

export async function getOpenClockEntry(employeeId: string) {
  return prisma.timeClockEntry.findFirst({
    where: { employeeId, clockOutAt: null },
    orderBy: { clockInAt: 'desc' },
  });
}

export async function resolveClockBranchForEmployee(args: {
  employmentType: string;
  fallbackBranchId: string;
  lat: number;
  lng: number;
}) {
  const { employmentType, fallbackBranchId, lat, lng } = args;
  if (employmentType !== 'part_time') {
    const branch = await prisma.branch.findUnique({ where: { id: fallbackBranchId } });
    return branch;
  }

  // Part-time can clock in from any configured branch geofence.
  const branches = await prisma.branch.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    orderBy: { name: 'asc' },
  });
  for (const b of branches) {
    if (b.latitude == null || b.longitude == null) continue;
    if (isInsideBranchRadius(lat, lng, b.latitude, b.longitude, b.geofenceRadiusM)) {
      return b;
    }
  }
  return null;
}

export async function getActiveAwaySession(employeeId: string) {
  return prisma.awaySession.findFirst({
    where: { employeeId, status: 'active' },
    orderBy: { startedAt: 'desc' },
  });
}

/** Direct manager User id, with branch-manager fallback when direct report mapping is missing. */
export async function getManagerUserIdForEmployee(employee: {
  reportsToEmployeeId: string | null;
  branchId?: string | null;
}): Promise<string | null> {
  if (employee.reportsToEmployeeId) {
    const mgr = await prisma.employee.findUnique({
      where: { id: employee.reportsToEmployeeId },
      select: { userId: true },
    });
    if (mgr?.userId) return mgr.userId;
  }

  if (!employee.branchId) return null;
  const branchManager = await prisma.employee.findFirst({
    where: {
      branchId: employee.branchId,
      role: 'manager',
      status: 'active',
      userId: { not: null },
    },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return branchManager?.userId ?? null;
}

/** Fallback: first owner user */
export async function getOwnerUserIds(): Promise<string[]> {
  const owners = await prisma.user.findMany({ where: { role: 'owner' }, select: { id: true } });
  return owners.map((o) => o.id);
}

export async function createInboxForUsers(
  userIds: string[],
  row: { category: string; title: string; body: string; dataJson?: string | null }
) {
  const unique = [...new Set(userIds)];
  await prisma.$transaction(
    unique.map((userId) =>
      prisma.inboxNotification.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          category: row.category,
          title: row.title,
          body: row.body,
          dataJson: row.dataJson ?? null,
        },
      })
    )
  );
}
