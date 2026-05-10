import type { PrismaClient } from '@prisma/client';

export type OwnerLiveAttendanceRow = {
  employeeId: string;
  name: string;
  branchName: string;
  clockedIn: boolean;
  clockInAt: string | null;
  clockedAtBranchName: string | null;
};

export async function getOwnerLiveAttendanceRows(prisma: PrismaClient): Promise<OwnerLiveAttendanceRow[]> {
  const rows = await prisma.employee.findMany({
    where: { status: { not: 'terminated' } },
    select: {
      id: true,
      name: true,
      branch: { select: { name: true } },
      timeClockEntries: {
        where: { clockOutAt: null },
        take: 1,
        orderBy: { clockInAt: 'desc' },
        select: {
          clockInAt: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return rows.map((e) => {
    const open = e.timeClockEntries[0];
    return {
      employeeId: e.id,
      name: e.name,
      branchName: e.branch.name,
      clockedIn: !!open,
      clockInAt: open ? open.clockInAt.toISOString() : null,
      clockedAtBranchName: open ? open.branch.name : null,
    };
  });
}
