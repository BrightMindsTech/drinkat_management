import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { managerPhotoSubmissionWhere } from '@/lib/photo-review-notify';
import { submissionUploadPaths } from '@/lib/photo-multi';
import { signStoredUploadPath } from '@/lib/upload-signed-url';

export const GET = withApiErrors(async function GET() {
  const session = await requireCapability('qc:review');
  const role = normalizeUserRole(session.user.role);
  const scope = dataScopeForRole(role);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  const where =
    scope === 'organization'
      ? { status: 'pending_qc' }
      : scope === 'branch' && user?.employee
        ? { status: 'pending_qc', ...managerPhotoSubmissionWhere(user.employee) }
        : { status: 'pending_qc', id: '__none__' };

  const items = await prisma.photoCheckSubmission.findMany({
    where,
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
