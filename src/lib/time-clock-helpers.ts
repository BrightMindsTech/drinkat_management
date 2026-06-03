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
  department: { id: string; name: string } | null;
  shiftDefinition: { id: string; key: string; startMinute: number; endMinute: number; crossesMidnight: boolean } | null;
};

const branchSelectForTimeClock = {
  id: true,
  name: true,
  latitude: true,
  longitude: true,
  geofenceRadiusM: true,
  shiftProfile: true,
} as const;

const shiftSelectForTimeClock = {
  id: true,
  key: true,
  name: true,
  startMinute: true,
  endMinute: true,
  crossesMidnight: true,
} as const;

function normalizeTimeClockEmployee(
  emp: {
    id: string;
    userId: string | null;
    branchId: string;
    name: string;
    role: string;
    status: string;
    employmentType?: string;
    branch: {
      id: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
      geofenceRadiusM: number;
      shiftProfile?: string;
    };
    department: { id: string; name: string } | null;
    shiftDefinition?: {
      id: string;
      key: string;
      name: string;
      startMinute: number;
      endMinute: number;
      crossesMidnight: boolean;
    } | null;
  } & Record<string, unknown>
): TimeClockEmployee {
  return {
    ...(emp as TimeClockEmployee),
    employmentType: emp.employmentType ?? 'full_time',
    branch: {
      id: emp.branch.id,
      name: emp.branch.name,
      latitude: emp.branch.latitude,
      longitude: emp.branch.longitude,
      geofenceRadiusM: emp.branch.geofenceRadiusM ?? 25,
      shiftProfile: emp.branch.shiftProfile ?? 'default',
    },
    shiftDefinition: emp.shiftDefinition ?? null,
  } as TimeClockEmployee;
}

/** Owner is excluded from time clock entirely. */
export async function getTimeClockEmployee(userId: string, userRole: string): Promise<TimeClockEmployee | null> {
  if (normalizeUserRole(userRole) === 'owner') return null;
  try {
    const emp = await prisma.employee.findUnique({
      where: { userId },
      include: {
        branch: { select: branchSelectForTimeClock },
        department: { select: { id: true, name: true } },
        shiftDefinition: { select: shiftSelectForTimeClock },
      },
    });
    if (!emp || emp.status === 'terminated') return null;
    return normalizeTimeClockEmployee(emp);
  } catch (e) {
    console.error('[getTimeClockEmployee] full include failed, retrying minimal', e);
    try {
      const emp = await prisma.employee.findUnique({
        where: { userId },
        include: {
          branch: { select: { id: true, name: true, latitude: true, longitude: true, geofenceRadiusM: true } },
          department: { select: { id: true, name: true } },
        },
      });
      if (!emp || emp.status === 'terminated') return null;
      return normalizeTimeClockEmployee({
        ...emp,
        shiftDefinition: null,
        branch: { ...emp.branch, shiftProfile: 'default' },
      });
    } catch (e2) {
      console.error('[getTimeClockEmployee] minimal query failed', e2);
      return null;
    }
  }
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
  /** Remote QC / named allowlist: no radius check (still records lat/lng on the entry). */
  geofenceExempt: boolean;
}) {
  const { employmentType, fallbackBranchId, lat, lng, geofenceExempt } = args;

  if (geofenceExempt) {
    return prisma.branch.findUnique({ where: { id: fallbackBranchId } });
  }

  if (employmentType === 'part_time') {
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

  // Full-time: must be inside assigned branch geofence when coordinates are configured.
  const branch = await prisma.branch.findUnique({ where: { id: fallbackBranchId } });
  if (!branch) return null;
  if (branch.latitude == null || branch.longitude == null) return null;
  if (!isInsideBranchRadius(lat, lng, branch.latitude, branch.longitude, branch.geofenceRadiusM)) {
    return null;
  }
  return branch;
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

/** All active branch managers with linked user accounts. */
export async function getManagerUserIdsForBranch(branchId: string): Promise<string[]> {
  const managers = await prisma.employee.findMany({
    where: {
      branchId,
      role: 'manager',
      status: 'active',
      userId: { not: null },
    },
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return managers.map((m) => m.userId!).filter((id): id is string => !!id);
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
  for (const userId of unique) {
    await prisma.inboxNotification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        category: row.category,
        title: row.title,
        body: row.body,
        dataJson: row.dataJson ?? null,
      },
    });
  }
}
