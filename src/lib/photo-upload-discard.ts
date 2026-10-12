import type { PrismaClient } from '@prisma/client';
import { deleteUploadedFile } from '@/lib/upload-storage';
import { objectKeyFromUploadPath } from '@/lib/upload-access';

const DISCARD_REASONS = new Set(['cancelled_submit', 'failed_submit']);

export function isDiscardReason(value: string): value is 'cancelled_submit' | 'failed_submit' {
  return DISCARD_REASONS.has(value);
}

/**
 * Delete R2 objects the actor just uploaded that never became a photo-check submission.
 * Never deletes objects referenced by a submission, image row, or another user.
 */
export async function discardUncommittedUploads(
  prisma: PrismaClient,
  opts: { userId: string; paths: string[]; reason: string }
): Promise<{ discarded: string[]; skipped: string[] }> {
  const discarded: string[] = [];
  const skipped: string[] = [];
  const unique = [...new Set(opts.paths.map((p) => String(p ?? '').trim()).filter((p) => p.length >= 4))].slice(0, 3);

  for (const uploadPath of unique) {
    const objectKey = objectKeyFromUploadPath(uploadPath);
    if (!objectKey) {
      skipped.push(uploadPath);
      continue;
    }
    const owned = await prisma.uploadObject.findUnique({
      where: { objectKey },
      select: { uploadedByUserId: true },
    });
    if (!owned || owned.uploadedByUserId !== opts.userId) {
      skipped.push(uploadPath);
      continue;
    }
    const needles = [`/api/uploads/${objectKey}`, `/uploads/${objectKey}`, uploadPath];
    const usedCover = await prisma.photoCheckSubmission.findFirst({
      where: { uploadPath: { in: needles } },
      select: { id: true },
    });
    const usedChild = await prisma.photoCheckSubmissionImage.findFirst({
      where: { uploadPath: { in: needles } },
      select: { id: true },
    });
    if (usedCover || usedChild) {
      skipped.push(uploadPath);
      continue;
    }
    await deleteUploadedFile(uploadPath);
    await prisma.uploadObject.delete({ where: { objectKey } }).catch(() => undefined);
    await prisma.photoUploadDiscard.create({
      data: { userId: opts.userId, objectKey, reason: opts.reason },
    });
    discarded.push(uploadPath);
  }
  return { discarded, skipped };
}
