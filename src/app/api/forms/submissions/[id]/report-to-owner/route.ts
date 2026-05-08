import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

/** Deprecated: owners now receive form submissions immediately at submit time. */
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

  return Response.json({
    ok: true,
    message: 'Owner notifications are now automatic; no manual report needed.',
    submissionId: submission.id,
  });
}
