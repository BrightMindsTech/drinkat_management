import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { parseTemplateFields, validateAnswersAgainstFields } from '@/lib/formTemplate';
import { createIssuesFromFailedAnswers } from '@/lib/issue-lifecycle';
import { getManagerUserIdForEmployee, getOwnerUserIds } from '@/lib/notify-helpers';
import { notifyUsers } from '@/lib/user-notify';
import { z } from 'zod';

const schema = z.object({ answers: z.record(z.unknown()) });

export const POST = withApiErrors(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCapability('inspections:run');
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const task = await prisma.inspectionTask.findUnique({
    where: { id },
    include: { templateVersion: true, assignee: true },
  });
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 });
  if (task.assigneeEmployeeId !== user?.employee?.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['completed', 'excused', 'cancelled'].includes(task.status)) {
    return Response.json({ error: 'Task already closed' }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const fields = parseTemplateFields(task.templateVersion.fieldsJson);
  if (fields.length === 0) {
    return Response.json({ error: 'Inspection template has no questions' }, { status: 400 });
  }
  let answers: Record<string, string>;
  try {
    answers = validateAnswersAgainstFields(fields, parsed.data.answers);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Invalid' }, { status: 400 });
  }

  const claimed = await prisma.inspectionTask.updateMany({
    where: {
      id,
      submittedAt: null,
      status: { notIn: ['completed', 'excused', 'cancelled'] },
    },
    data: { submittedAt: new Date(), status: 'in_progress' },
  });
  if (claimed.count === 0) {
    return Response.json({ error: 'Task already closed' }, { status: 400 });
  }

  try {
    const submission = await prisma.managementFormSubmission.create({
      data: {
        templateId: task.templateVersion.templateId,
        templateVersionId: task.templateVersionId,
        employeeId: task.assigneeEmployeeId,
        branchId: task.branchId,
        answersJson: JSON.stringify(answers),
        status: 'submitted',
      },
    });

    const defaultAssignee = await prisma.employee.findFirst({
      where: { branchId: task.branchId, role: 'manager', status: 'active' },
      select: { id: true, userId: true },
    });

    const issues = await createIssuesFromFailedAnswers(prisma, {
      submissionId: submission.id,
      inspectionTaskId: task.id,
      branchId: task.branchId,
      answers,
      fields,
      defaultAssigneeEmployeeId: defaultAssignee?.id ?? null,
    });

    const updated = await prisma.inspectionTask.update({
      where: { id },
      data: {
        status: 'completed',
        submissionId: submission.id,
        draftJson: null,
      },
    });

    const notifyIds = [
      ...(await getOwnerUserIds()),
      (await getManagerUserIdForEmployee(task.assignee)) ?? '',
      defaultAssignee?.userId ?? '',
    ].filter(Boolean);
    if (notifyIds.length) {
      await notifyUsers(prisma, notifyIds, {
        category: issues.created > 0 ? 'issue_opened' : 'inspection_submitted',
        title:
          issues.created > 0
            ? `${issues.created} issue(s) opened: ${task.templateVersion.title}`
            : `Inspection submitted: ${task.templateVersion.title}`,
        body: `${task.assignee.name} completed ${task.templateVersion.title}. ${issues.created} issue(s) opened.`,
        push: {
          title: issues.created > 0 ? 'New QC issue' : 'Inspection submitted',
          body: `${task.templateVersion.title} · ${issues.created} issue(s)`,
          data: {
            type: issues.created > 0 ? 'issue_opened' : 'inspection_submitted',
            url: issues.created > 0 ? '/dashboard/issues' : '/dashboard/tasks',
            taskId: task.id,
          },
        },
      });
    }

    return Response.json({
      ok: true,
      task: updated,
      submissionId: submission.id,
      issuesCreated: issues.created,
      issueIds: issues.issueIds,
    });
  } catch (e) {
    await prisma.inspectionTask
      .update({
        where: { id },
        data: { submittedAt: null, status: task.status },
      })
      .catch(() => undefined);
    throw e;
  }
});
