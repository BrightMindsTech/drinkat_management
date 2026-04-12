import { prisma } from '@/lib/prisma';
import { deleteUploadedFile } from '@/lib/upload-storage';

let lastRunMonthUtc: string | null = null;

function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Deletes QC submission photos from previous months.
 * Runs only on/after day 7 (UTC), once per month per runtime instance.
 */
export async function runQcPhotoMonthlyCleanupIfDue(now: Date = new Date()) {
  const dayOfMonthUtc = now.getUTCDate();
  if (dayOfMonthUtc < 7) return;

  const thisMonthKey = monthKeyUtc(now);
  if (lastRunMonthUtc === thisMonthKey) return;

  const startOfCurrentMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const photos = await prisma.submissionPhoto.findMany({
    where: { createdAt: { lt: startOfCurrentMonthUtc } },
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
