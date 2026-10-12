import type { PrismaClient } from '@prisma/client';

/** Same-branch photo windows: first successful submit wins until the next period. */
export const BRANCH_PHOTO_CLAIMED = 'branch_claimed';
export const BRANCH_PHOTO_CLAIMED_CODE = 'BRANCH_CLAIMED';

export function photoBranchWindowKey(branchId: string, scheduleId: string): string {
  return `${branchId}:${scheduleId}`;
}

export function pickPhotoWindowWinner<T extends { id: string; submittedAt: Date | string | null | undefined }>(
  rows: T[]
): T | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  })[0];
}

export async function listClaimedPhotoWindows(
  prisma: PrismaClient,
  opts: { periodKey: string; branchId?: string }
): Promise<Set<string>> {
  const rows = await prisma.photoCheckTask.findMany({
    where: {
      periodKey: opts.periodKey,
      status: 'completed',
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
    },
    select: { scheduleId: true, branchId: true },
  });
  return new Set(rows.map((r) => photoBranchWindowKey(r.branchId, r.scheduleId)));
}

export async function hideClaimedPhotoTasksForEmployee(
  prisma: PrismaClient,
  opts: { employeeId: string; branchId: string; periodKey: string }
): Promise<{ claimedScheduleIds: string[]; cancelled: number }> {
  const claimed = await prisma.photoCheckTask.findMany({
    where: {
      branchId: opts.branchId,
      periodKey: opts.periodKey,
      status: 'completed',
      NOT: { assigneeEmployeeId: opts.employeeId },
    },
    select: { scheduleId: true },
  });
  const claimedScheduleIds = [...new Set(claimed.map((c) => c.scheduleId))];
  if (!claimedScheduleIds.length) return { claimedScheduleIds, cancelled: 0 };
  const res = await prisma.photoCheckTask.updateMany({
    where: {
      assigneeEmployeeId: opts.employeeId,
      branchId: opts.branchId,
      periodKey: opts.periodKey,
      scheduleId: { in: claimedScheduleIds },
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
    },
    data: { status: 'cancelled', excusedReason: BRANCH_PHOTO_CLAIMED },
  });
  return { claimedScheduleIds, cancelled: res.count };
}

async function voidLostClaim(
  prisma: PrismaClient,
  taskId: string,
  submissionId: string | null
): Promise<void> {
  if (submissionId) {
    await prisma.photoCheckSubmission.delete({ where: { id: submissionId } }).catch(() => undefined);
  }
  await prisma.photoCheckTask.update({
    where: { id: taskId },
    data: { status: 'cancelled', submissionId: null, excusedReason: BRANCH_PHOTO_CLAIMED },
  });
}

/** After a successful submit: keep the earliest same-branch winner and drop the rest. */
export async function claimPhotoWindowForBranch(
  prisma: PrismaClient,
  input: {
    winnerTaskId: string;
    submissionId: string;
    branchId: string;
    scheduleId: string;
    periodKey: string;
  }
): Promise<{ outcome: 'won' | 'lost'; winnerTaskId: string | null }> {
  const completed = await prisma.photoCheckTask.findMany({
    where: {
      scheduleId: input.scheduleId,
      periodKey: input.periodKey,
      branchId: input.branchId,
      status: 'completed',
    },
    select: {
      id: true,
      submission: { select: { id: true, submittedAt: true } },
    },
  });
  const ranked = completed.map((row) => ({
    id: row.id,
    submittedAt: row.submission?.submittedAt ?? null,
    submissionId: row.submission?.id ?? null,
  }));
  const winner = pickPhotoWindowWinner(ranked);
  if (!winner) return { outcome: 'lost', winnerTaskId: null };

  if (winner.id !== input.winnerTaskId) {
    await voidLostClaim(prisma, input.winnerTaskId, input.submissionId);
    return { outcome: 'lost', winnerTaskId: winner.id };
  }

  for (const row of ranked) {
    if (row.id === winner.id) continue;
    await voidLostClaim(prisma, row.id, row.submissionId);
  }

  await prisma.photoCheckTask.updateMany({
    where: {
      scheduleId: input.scheduleId,
      periodKey: input.periodKey,
      branchId: input.branchId,
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
      NOT: { id: input.winnerTaskId },
    },
    data: { status: 'cancelled', excusedReason: BRANCH_PHOTO_CLAIMED },
  });

  return { outcome: 'won', winnerTaskId: winner.id };
}
