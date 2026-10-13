import type { Session } from 'next-auth';
import type { PrismaClient } from '@prisma/client';
import { deleteUploadedFile } from '@/lib/upload-storage';
import { objectKeyFromUploadPath } from '@/lib/upload-access';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';
import { submissionUploadPaths } from '@/lib/photo-multi';

export const PHOTO_ARCHIVE_RETENTION_DAYS = 30;
export const PHOTO_ARCHIVE_PURGED_PATH = 'purged';
export const PHOTO_ARCHIVE_PURGE_BATCH = 80;

const WATERMARK_KEY = 'photo_archive_retention';
const PURGE_THROTTLE_MS = 24 * 60 * 60 * 1000;

export function photoArchiveCutoff(now = new Date()): Date {
  return new Date(now.getTime() - PHOTO_ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function isPurgedPhotoPath(uploadPath: string | null | undefined): boolean {
  const s = String(uploadPath ?? '').trim();
  return !s || s === PHOTO_ARCHIVE_PURGED_PATH;
}

export async function userCanViewPhotoArchive(prisma: PrismaClient, session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  if (await userHasQcReviewerScope(prisma, session)) return true;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true },
  });
  return Boolean(user?.hrKpiReviewer);
}

export async function purgeExpiredPhotoArchive(
  prisma: PrismaClient,
  now = new Date()
): Promise<{ purged: number; skipped: number }> {
  const row = await prisma.appCronWatermark.findUnique({
    where: { key: WATERMARK_KEY },
    select: { lastRunAt: true },
  });
  if (row && now.getTime() - row.lastRunAt.getTime() < PURGE_THROTTLE_MS) {
    return { purged: 0, skipped: 0 };
  }

  const cutoff = photoArchiveCutoff(now);
  const stale = await prisma.photoCheckSubmission.findMany({
    where: {
      submittedAt: { lt: cutoff },
      NOT: { uploadPath: PHOTO_ARCHIVE_PURGED_PATH },
    },
    include: { images: { select: { id: true, uploadPath: true } } },
    take: PHOTO_ARCHIVE_PURGE_BATCH,
    orderBy: { submittedAt: 'asc' },
  });

  let purged = 0;
  let skipped = 0;
  for (const item of stale) {
    const paths = submissionUploadPaths(item).filter((p) => !isPurgedPhotoPath(p));
    for (const uploadPath of paths) {
      await deleteUploadedFile(uploadPath);
      const objectKey = objectKeyFromUploadPath(uploadPath);
      if (objectKey) {
        await prisma.uploadObject.delete({ where: { objectKey } }).catch(() => undefined);
      }
    }
    if (item.images.length) {
      await prisma.photoCheckSubmissionImage.deleteMany({ where: { submissionId: item.id } });
    }
    await prisma.photoCheckSubmission.update({
      where: { id: item.id },
      data: { uploadPath: PHOTO_ARCHIVE_PURGED_PATH },
    });
    purged += 1;
  }
  if (!stale.length) skipped += 1;

  await prisma.appCronWatermark.upsert({
    where: { key: WATERMARK_KEY },
    create: { key: WATERMARK_KEY, lastRunAt: now },
    update: { lastRunAt: now },
  });
  return { purged, skipped };
}
