import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';

export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    const qcReviewerScope = await userHasQcReviewerScope(prisma, session);

    if ((role === 'staff' && !qcReviewerScope) || role === 'marketing') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employee: { select: { id: true } } },
      });
      if (!user?.employee) return Response.json({ total: 0, items: [] });

      if (role === 'marketing') {
        return Response.json({ total: 0, items: [] });
      }

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

    let pendingQcPromise: Promise<{ id: string; assignment: { checklist: { name: string } }; employee: { name: string } }[]>;
    let pendingLeavePromise: Promise<{ id: string; employee: { name: string } }[]>;
    let pendingAdvancesPromise: Promise<{ id: string; employee: { name: string }; amount: number }[]>;

    if (role === 'manager') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employee: { select: { id: true } } },
      });
      if (!user?.employee) return Response.json({ total: 0, items: [] });

      const managerEmployeeId = user.employee.id;

      pendingQcPromise = prisma.qcSubmission.findMany({
      where: {
        status: 'pending',
        employee: { reportsToEmployeeId: managerEmployeeId },
      },
      select: {
        id: true,
        employee: { select: { name: true } },
        assignment: { select: { checklist: { select: { name: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

      pendingLeavePromise = prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        employee: { reportsToEmployeeId: managerEmployeeId },
      },
      select: { id: true, employee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

      pendingAdvancesPromise = prisma.advance.findMany({
      where: {
        status: 'pending',
        employee: { reportsToEmployeeId: managerEmployeeId },
      },
      select: { id: true, employee: { select: { name: true } }, amount: true },
      orderBy: { requestedAt: 'desc' },
    });
    } else {
      pendingQcPromise = prisma.qcSubmission.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        employee: { select: { name: true } },
        assignment: { select: { checklist: { select: { name: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

      pendingLeavePromise =
        role === 'owner'
          ? prisma.leaveRequest.findMany({
              where: { status: 'pending' },
              select: { id: true, employee: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
            })
          : Promise.resolve([]);

      pendingAdvancesPromise =
        role === 'owner'
          ? prisma.advance.findMany({
              where: { status: 'pending' },
              select: { id: true, employee: { select: { name: true } }, amount: true },
              orderBy: { requestedAt: 'desc' },
            })
          : Promise.resolve([]);
    }

    const [pendingQc, pendingLeave, pendingAdvances] = await Promise.all([
      pendingQcPromise,
      pendingLeavePromise,
      pendingAdvancesPromise,
    ]);

    const items = [
      ...pendingQc.map((s) => ({
        id: `qc-${s.id}`,
        type: 'qc_review',
        title: s.assignment.checklist.name,
        subtitle: s.employee.name,
        href: `/dashboard/qc#qc-review-submission-${s.id}`,
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
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[review-notifications GET]', e);
    return Response.json({ total: 0, items: [] }, { status: 200 });
  }
}

