import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import { createInboxForUsers, getOwnerUserIds } from '@/lib/time-clock-helpers';

type Ctx = { params: Promise<{ id: string }> };

/** Manager escalates a form submission to owners (Manager reports inbox). */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'manager') {
    return Response.json({ error: 'Only managers can report form submissions to the owner' }, { status: 403 });
  }

  const { id: submissionId } = await ctx.params;

  const mgr = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!mgr) {
    return Response.json({ error: 'No employee record for manager' }, { status: 403 });
  }

  const submission = await prisma.managementFormSubmission.findUnique({
    where: { id: submissionId },
    include: {
      employee: { select: { id: true, name: true, reportsToEmployeeId: true } },
      template: { select: { id: true, title: true, category: true } },
      branch: { select: { name: true } },
    },
  });
  if (!submission) {
    return Response.json({ error: 'Submission not found' }, { status: 404 });
  }

  const okTeam = submission.employee.reportsToEmployeeId === mgr.id;
  if (!okTeam) {
    return Response.json({ error: 'You can only report submissions from your direct reports' }, { status: 403 });
  }

  const owners = await getOwnerUserIds();
  if (owners.length === 0) {
    return Response.json({ ok: true, skipped: 'no_owners' });
  }

  const whenIso = new Date(submission.submittedAt).toISOString();
  const details = `Form "${submission.template.title}" · ${submission.employee.name} · ${submission.branch.name}`;

  await createInboxForUsers(owners, {
    category: 'manager_form_report',
    title: `Manager report: form submission`,
    body: `${details} · ${new Date(whenIso).toLocaleString()}`,
    dataJson: JSON.stringify({
      source: 'manager_forms_review',
      logId: `form-submission-${submission.id}`,
      submissionId: submission.id,
      templateId: submission.template.id,
      templateTitle: submission.template.title,
      employeeId: submission.employee.id,
      employeeName: submission.employee.name,
      when: whenIso,
      type: 'form_submission',
      details,
      reportedByUserId: session.user.id,
    }),
  });

  return Response.json({ ok: true });
}
