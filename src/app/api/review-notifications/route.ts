import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';

export async function GET() {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);

  if (role === 'staff') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employee: { select: { id: true } } },
    });
    if (!user?.employee) return Response.json({ total: 0, items: [] });

    const assignments = await prisma.checklistAssignment.findMany({
      where: { employeeId: user.employee.id },
      include: {
        checklist: { select: { id: true, name: true, repeatsDaily: true } },
        submissions: { select: { id: true, submittedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const needsSubmission = assignments.filter((a) => {
      if (a.checklist.repeatsDaily) {
        return !a.submissions.some((s) => s.submittedAt >= startOfToday && s.submittedAt <= endOfToday);
      }
      return a.submissions.length === 0;
    });

    return Response.json({
      total: needsSubmission.length,
      items: needsSubmission.map((a) => ({
        id: a.id,
        type: 'staff_qc_submit',
        title: a.checklist.name,
        href: `/dashboard/qc#qc-assignment-${a.id}`,
      })),
    });
  }

  const pendingQcPromise = prisma.qcSubmission.findMany({
    where: { status: 'pending' },
    select: {
      id: true,
      employee: { select: { name: true } },
      assignment: { select: { checklist: { select: { name: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const pendingFormsPromise =
    role === 'owner'
      ? prisma.managementFormSubmission.findMany({
          where: { status: 'pending' },
          select: {
            id: true,
            employee: { select: { name: true } },
            template: { select: { title: true } },
          },
          orderBy: { submittedAt: 'desc' },
        })
      : prisma.managementFormSubmission.findMany({
          where: {
            status: 'pending',
            template: { category: { in: ['qc', 'marketing', 'kitchen', 'cash'] } },
          },
          select: {
            id: true,
            employee: { select: { name: true } },
            template: { select: { title: true } },
          },
          orderBy: { submittedAt: 'desc' },
        });

  const [pendingQc, pendingForms] = await Promise.all([pendingQcPromise, pendingFormsPromise]);
  const [pendingLeave, pendingAdvances] =
    role === 'owner'
      ? await Promise.all([
          prisma.leaveRequest.findMany({
            where: { status: 'pending' },
            select: { id: true, employee: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
          }),
          prisma.advance.findMany({
            where: { status: 'pending' },
            select: { id: true, employee: { select: { name: true } }, amount: true },
            orderBy: { requestedAt: 'desc' },
          }),
        ])
      : [[], []];

  const items = [
    ...pendingQc.map((s) => ({
      id: `qc-${s.id}`,
      type: 'qc_review',
      title: s.assignment.checklist.name,
      subtitle: s.employee.name,
      href: `/dashboard/qc#qc-review-submission-${s.id}`,
    })),
    ...pendingForms.map((s) => ({
      id: `forms-${s.id}`,
      type: 'forms_review',
      title: s.template.title,
      subtitle: s.employee.name,
      href: `/dashboard/forms#forms-review-submission-${s.id}`,
    })),
    ...pendingLeave.map((l) => ({
      id: `leave-${l.id}`,
      type: 'leave_review',
      title: l.employee.name,
      href: '/dashboard/hr#hr-owner-leave',
    })),
    ...pendingAdvances.map((a) => ({
      id: `advance-${a.id}`,
      type: 'advance_review',
      title: a.employee.name,
      subtitle: `${a.amount.toFixed(2)} JOD`,
      href: '/dashboard/hr#hr-owner-advances',
    })),
  ];

  return Response.json({
    total: items.length,
    items,
  });
}

