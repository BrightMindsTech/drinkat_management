import { prisma } from '@/lib/prisma';
import { deleteUploadedFile } from '@/lib/upload-storage';

let lastRunMonthUtc: string | null = null;

function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Deletes QC submission photos one full calendar month after the submission month (UTC).
 * Example: March submissions stay for all of March and all of April; they become eligible
 * in May (first cleanup on/after May 7 UTC). Same pattern for every month.
 *
 * Cutoff: `submittedAt` strictly before the first day of the **previous** UTC month
 * (when now is May → cutoff is April 1 → removes March and earlier, keeps April onward).
 *
 * Uses `QcSubmission.submittedAt` (not `SubmissionPhoto.createdAt`).
 *
 * Runs only on/after day 7 (UTC), once per month per runtime instance.
 */
export async function runQcPhotoMonthlyCleanupIfDue(now: Date = new Date()) {
  const dayOfMonthUtc = now.getUTCDate();
  if (dayOfMonthUtc < 7) return;

  const thisMonthKey = monthKeyUtc(now);
  if (lastRunMonthUtc === thisMonthKey) return;

  const cutoffExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));

  const photos = await prisma.submissionPhoto.findMany({
    where: {
      submission: { submittedAt: { lt: cutoffExclusive } },
    },
    select: { id: true, filePath: true },
  });

  if (!photos.length) {
    lastRunMonthUtc = thisMonthKey;
    return;
  }

  const ids = photos.map((p) => p.id);
  await prisma.submissionPhoto.deleteMany({
    where: { id: { in: ids } },
  });

  await Promise.all(
    photos.map(async (p) => {
      try {
        await deleteUploadedFile(p.filePath);
      } catch {
        // Best-effort storage cleanup; DB records are already removed.
      }
    })
  );

  lastRunMonthUtc = thisMonthKey;
}
