import type { PrismaClient } from '@prisma/client';

export const FORM_SUBMISSION_RETENTION_DAYS = 30;

const WATERMARK_KEY = 'management_form_submission_retention';
const PURGE_THROTTLE_MS = 6 * 60 * 60 * 1000;

export async function maybePurgeOldManagementFormSubmissions(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  try {
    const row = await prisma.appCronWatermark.findUnique({
      where: { key: WATERMARK_KEY },
      select: { lastRunAt: true },
    });
    if (row && now.getTime() - row.lastRunAt.getTime() < PURGE_THROTTLE_MS) return;

    const cutoff = new Date(now.getTime() - FORM_SUBMISSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.managementFormSubmission.deleteMany({
      where: { submittedAt: { lt: cutoff } },
    });

    await prisma.appCronWatermark.upsert({
      where: { key: WATERMARK_KEY },
      create: { key: WATERMARK_KEY, lastRunAt: now },
      update: { lastRunAt: now },
    });
  } catch (error) {
    console.error('[form-submission-retention] maybePurgeOldManagementFormSubmissions', error);
  }
}
