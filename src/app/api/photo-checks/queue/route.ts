import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { submissionUploadPaths } from '@/lib/photo-multi';

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
      : scope === 'branch' && user?.employee?.branchId
        ? { status: 'pending_qc', branchId: user.employee.branchId }
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
      uploadPaths: submissionUploadPaths(item),
    })),
    remaining: items.length,
  });
});
