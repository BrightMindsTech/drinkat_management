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

  const owned = await prisma.uploadObject.findUnique({
    where: { objectKey: opts.objectKey },
    select: { uploadedByUserId: true },
  });
  if (owned?.uploadedByUserId === opts.userId) return true;

  const pathNeedles = [`/api/uploads/${opts.objectKey}`, `/uploads/${opts.objectKey}`];

  const issue = await prisma.issue.findFirst({
    where: {
      OR: [
        { beforePhotoPath: { in: pathNeedles } },
        { afterPhotoPath: { in: pathNeedles } },
      ],
    },
    select: { branchId: true, assigneeEmployeeId: true },
  });
  if (issue && canSeeIssue(role, opts.employee, issue)) return true;

  if (opts.employee) {
    const ownDoc = await prisma.employeeDocument.findFirst({
      where: {
        employeeId: opts.employee.id,
        filePath: { in: pathNeedles },
      },
      select: { id: true },
    });
    if (ownDoc) return true;
  }

  const ownSubmission = await prisma.managementFormSubmission.findFirst({
    where: {
      employeeId: opts.employee?.id ?? '__none__',
      OR: pathNeedles.map((p) => ({ answersJson: { contains: p } })),
    },
    select: { id: true },
  });
  if (ownSubmission) return true;

  if (opts.employee && (role === 'manager' || role === 'assistant_manager')) {
    const branchSub = await prisma.managementFormSubmission.findFirst({
      where: {
        branchId: opts.employee.branchId,
        OR: pathNeedles.map((p) => ({ answersJson: { contains: p } })),
      },
      select: { id: true },
    });
    if (branchSub) return true;
  }

  const ownDraft = await prisma.inspectionTask.findFirst({
    where: {
      assigneeEmployeeId: opts.employee?.id ?? '__none__',
      OR: pathNeedles.map((p) => ({ draftJson: { contains: p } })),
    },
    select: { id: true },
  });
  if (ownDraft) return true;

  const photo = await prisma.photoCheckSubmission.findFirst({
    where: {
      OR: [
        { uploadPath: { in: pathNeedles } },
        { images: { some: { uploadPath: { in: pathNeedles } } } },
      ],
    },
    select: { employeeId: true, branchId: true },
  });
  if (photo) {
    if (opts.employee?.id === photo.employeeId) return true;
    if (role === 'manager' && opts.employee?.branchId === photo.branchId) return true;
    const hr = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { hrKpiReviewer: true },
    });
    if (hr?.hrKpiReviewer) return true;
  }

  return false;
}
