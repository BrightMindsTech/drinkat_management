import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { parseTemplateFields } from '@/lib/formTemplate';

export const GET = withApiErrors(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const role = normalizeUserRole(session.user.role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const task = await prisma.inspectionTask.findUnique({
    where: { id },
    include: {
      branch: true,
      assignee: { select: { id: true, name: true, branchId: true } },
      templateVersion: true,
      schedule: true,
    },
  });
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 });
  const mine = user?.employee?.id === task.assigneeEmployeeId;
  const branchOk =
    hasCapability(role, 'inspections:viewBranch') &&
    (role === 'owner' || role === 'qc' || user?.employee?.branchId === task.branchId);
  if (!mine && !branchOk) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const terminal = ['completed', 'excused', 'cancelled'].includes(task.status);
  let submittedAnswers: Record<string, unknown> | null = null;
  if (task.submissionId) {
    const submission = await prisma.managementFormSubmission.findUnique({
      where: { id: task.submissionId },
      select: { answersJson: true },
    });
    if (submission?.answersJson) {
      try {
        submittedAnswers = JSON.parse(submission.answersJson) as Record<string, unknown>;
      } catch {
        submittedAnswers = null;
      }
    }
  }
  return Response.json({
    ...task,
    fields: parseTemplateFields(task.templateVersion.fieldsJson),
    submittedAnswers,
    readOnly: terminal,
  });
});
