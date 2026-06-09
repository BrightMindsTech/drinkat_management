import { prisma } from '@/lib/prisma';

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
