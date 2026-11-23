import { prisma } from '@/lib/prisma';
import { requirePhotoQcReviewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { submissionUploadPaths } from '@/lib/photo-multi';
import { signStoredUploadPath } from '@/lib/upload-signed-url';

export const GET = withApiErrors(async function GET() {
  await requirePhotoQcReviewer();

  const items = await prisma.photoCheckSubmission.findMany({
    where: { status: 'pending_qc' },
    include: {
      employee: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      type: { select: { titleEn: true, titleAr: true, code: true, criteriaJson: true } },
      task: { select: { slotKey: true, periodKey: true } },
      images: { orderBy: { sortOrder: 'asc' }, select: { uploadPath: true, sortOrder: true } },
    },
    orderBy: { submittedAt: 'asc' },
    take: 80,
  });

  return Response.json({
    items: items.map((item) => ({
      ...item,
      uploadPath: signStoredUploadPath(item.uploadPath),
      uploadPaths: submissionUploadPaths(item).map(signStoredUploadPath),
    })),
    remaining: items.length,
  });
});
