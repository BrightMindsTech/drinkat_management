import type { PrismaClient } from '@prisma/client';
import { getManagerUserIdsForBranch } from '@/lib/notify-helpers';

export type PhotoSubmitter = {
  reportsToEmployeeId: string | null;
  branchId: string;
};

/** Manager photo queue: direct reports anywhere, plus unassigned staff at this branch. */
export function managerPhotoSubmissionWhere(manager: { id: string; branchId: string }) {
  return {
    OR: [
      { employee: { reportsToEmployeeId: manager.id } },
      { branchId: manager.branchId, employee: { reportsToEmployeeId: null } },
    ],
  };
}

/** Assigned manager if set; otherwise every manager of the submitter's branch. */
export function photoReviewManagerUserIds(opts: {
  reportsToUserId: string | null;
  branchManagerUserIds: string[];
}): string[] {
  if (opts.reportsToUserId) return [opts.reportsToUserId];
  return [...new Set(opts.branchManagerUserIds.filter(Boolean))];
}

/** Owner / QC always; managers only for this submitter's reporting line. */
export async function listPhotoReviewerUserIds(
  prisma: PrismaClient,
  opts: { submitter: PhotoSubmitter; excludeUserId?: string }
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ['owner', 'qc'] } },
    select: { id: true, employee: { select: { status: true } } },
  });
  const reviewerIds = users.filter((u) => u.employee?.status !== 'terminated').map((u) => u.id);

  let reportsToUserId: string | null = null;
  if (opts.submitter.reportsToEmployeeId) {
    const mgr = await prisma.employee.findUnique({
      where: { id: opts.submitter.reportsToEmployeeId },
      select: { userId: true, status: true },
    });
    if (mgr?.userId && mgr.status !== 'terminated') reportsToUserId = mgr.userId;
  }
  const branchManagerUserIds = reportsToUserId
    ? []
    : await getManagerUserIdsForBranch(opts.submitter.branchId);

  const ids = [...reviewerIds, ...photoReviewManagerUserIds({ reportsToUserId, branchManagerUserIds })];
  return [...new Set(ids.filter((id) => id && id !== opts.excludeUserId))];
}
