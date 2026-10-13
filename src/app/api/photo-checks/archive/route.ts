import { prisma } from '@/lib/prisma';
import { requirePhotoArchiveViewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { submissionUploadPaths } from '@/lib/photo-multi';
import { PHOTO_ARCHIVE_PURGED_PATH, photoArchiveCutoff } from '@/lib/photo-archive';

export const GET = withApiErrors(async function GET() {
  await requirePhotoArchiveViewer();
  const cutoff = photoArchiveCutoff();
  const items = await prisma.photoCheckSubmission.findMany({
    where: {
      submittedAt: { gte: cutoff },
      NOT: { uploadPath: PHOTO_ARCHIVE_PURGED_PATH },
    },
    include: {
      employee: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      type: { select: { titleEn: true, titleAr: true, code: true } },
      task: { select: { slotKey: true, periodKey: true } },
      images: { orderBy: { sortOrder: 'asc' }, select: { uploadPath: true, sortOrder: true } },
    },
    orderBy: { submittedAt: 'desc' },
    take: 120,
  });

  return Response.json({
    cutoff: cutoff.toISOString(),
    items: items
      .map((item) => {
        const uploadPaths = submissionUploadPaths(item);
        if (!uploadPaths.length) return null;
        return { ...item, uploadPaths };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
  });
});
