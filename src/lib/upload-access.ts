import type { PrismaClient } from '@prisma/client';
import { uploadKeyFromPath } from '@/lib/ai-images';
import { canSeeIssue } from '@/lib/issue-access';
import { normalizeUserRole } from '@/lib/permissions';

export function objectKeyFromUploadPath(filePath: string): string | null {
  return uploadKeyFromPath(filePath);
}

export async function recordUploadObject(
  prisma: PrismaClient,
  filePath: string,
  uploadedByUserId: string
): Promise<void> {
  const objectKey = objectKeyFromUploadPath(filePath);
  if (!objectKey) return;
  await prisma.uploadObject.upsert({
    where: { objectKey },
    update: {},
    create: { objectKey, uploadedByUserId },
  });
}

export async function actorCanReadUpload(
  prisma: PrismaClient,
  opts: {
    objectKey: string;
    userId: string;
    role: string;
    employee: { id: string; branchId: string } | null;
  }
): Promise<boolean> {
  const role = normalizeUserRole(opts.role);
  if (role === 'owner' || role === 'qc') return true;

  const pathNeedles = [`/api/uploads/${opts.objectKey}`, `/uploads/${opts.objectKey}`];
  const employeeId = opts.employee?.id ?? '__none__';
  const branchId = opts.employee?.branchId;

  const [owned, issue, ownDoc, ownSubmission, branchSub, ownDraft, fieldReport, photo] = await Promise.all([
    prisma.uploadObject.findUnique({
      where: { objectKey: opts.objectKey },
      select: { uploadedByUserId: true },
    }),
    prisma.issue.findFirst({
      where: {
        OR: [
          { beforePhotoPath: { in: pathNeedles } },
          { afterPhotoPath: { in: pathNeedles } },
        ],
      },
      select: { branchId: true, assigneeEmployeeId: true },
    }),
    opts.employee
      ? prisma.employeeDocument.findFirst({
          where: { employeeId: opts.employee.id, filePath: { in: pathNeedles } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.managementFormSubmission.findFirst({
      where: {
        employeeId,
        OR: pathNeedles.map((p) => ({ answersJson: { contains: p } })),
      },
      select: { id: true },
    }),
    opts.employee && (role === 'manager' || role === 'assistant_manager')
      ? prisma.managementFormSubmission.findFirst({
          where: {
            branchId: opts.employee.branchId,
            OR: pathNeedles.map((p) => ({ answersJson: { contains: p } })),
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.inspectionTask.findFirst({
      where: {
        assigneeEmployeeId: employeeId,
        OR: pathNeedles.map((p) => ({ draftJson: { contains: p } })),
      },
      select: { id: true },
    }),
    prisma.qcFieldReport.findFirst({
      where: { OR: pathNeedles.map((p) => ({ photosJson: { contains: p } })) },
      select: { id: true },
    }),
    prisma.photoCheckSubmission.findFirst({
      where: {
        OR: [
          { uploadPath: { in: pathNeedles } },
          { images: { some: { uploadPath: { in: pathNeedles } } } },
        ],
      },
      select: { employeeId: true, branchId: true },
    }),
  ]);

  if (owned?.uploadedByUserId === opts.userId) return true;
  if (issue && canSeeIssue(role, opts.employee, issue)) return true;
  if (ownDoc) return true;
  if (ownSubmission) return true;
  if (branchSub) return true;
  if (ownDraft) return true;
  if (fieldReport) {
    if (role === 'manager') return true;
    const flags = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { qcReportsInbox: true, hrKpiReviewer: true },
    });
    if (flags?.qcReportsInbox || flags?.hrKpiReviewer) return true;
  }
  if (photo) {
    if (opts.employee?.id === photo.employeeId) return true;
    if (role === 'manager' && branchId === photo.branchId) return true;
    const hr = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { hrKpiReviewer: true },
    });
    if (hr?.hrKpiReviewer) return true;
  }

  return false;
}
