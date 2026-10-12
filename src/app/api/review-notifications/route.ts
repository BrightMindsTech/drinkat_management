import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';
import { isTransientDbError } from '@/lib/prisma-retry';
import { logErrorThrottled } from '@/lib/log-throttle';

export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    const qcReviewerScope = await userHasQcReviewerScope(prisma, session);

    if ((role === 'staff' && !qcReviewerScope) || role === 'marketing') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          employee: {
            select: { id: true, photoCheckSetting: { select: { required: true } } },
          },
        },
      });
      if (!user?.employee) return Response.json({ total: 0, items: [] });

      if (role === 'marketing') {
        return Response.json({ total: 0, items: [] });
      }

      if (!user.employee.photoCheckSetting?.required) {
        return Response.json({ total: 0, items: [] });
      }

      const now = new Date();
      const openTasks = await prisma.photoCheckTask.findMany({
        where: {
          assigneeEmployeeId: user.employee.id,
          status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
          windowStartAt: { lte: now },
          dueAt: { gte: now },
        },
        select: { id: true, type: { select: { titleEn: true } } },
        orderBy: { dueAt: 'asc' },
        take: 8,
      });
      if (!openTasks.length) return Response.json({ total: 0, items: [] });
      return Response.json({
        total: openTasks.length,
        items: openTasks.map((task) => ({
          id: `photo-${task.id}`,
          type: 'staff_photo_check',
          title: task.type.titleEn,
          href: `/dashboard/photo?task=${encodeURIComponent(task.id)}`,
        })),
      });
    }

    let pendingQcPromise: Promise<{ id: string; assignment: { checklist: { name: string } }; employee: { name: string } }[]>;
    let pendingLeavePromise: Promise<{ id: string; employee: { name: string } }[]>;
    let pendingAdvancesPromise: Promise<{ id: string; employee: { name: string }; amount: number }[]>;

    let pendingQcFormsPromise: Promise<
      {
        id: string;
        template: { title: string };
        employee: { name: string };
        branch: { name: string };
      }[]
    > = Promise.resolve([]);

    if (role === 'manager') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { employee: { select: { id: true, branchId: true } } },
      });
      if (!user?.employee) return Response.json({ total: 0, items: [] });

      const managerEmployeeId = user.employee.id;
      const managerBranchId = user.employee.branchId;

      const qcFormSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      pendingQcFormsPromise = prisma.managementFormSubmission.findMany({
        where: {
          template: { category: 'qc' },
          branchId: managerBranchId,
          status: 'submitted',
          reviewedAt: null,
          submittedAt: { gte: qcFormSince },
        },
        select: {
          id: true,
          template: { select: { title: true } },
          employee: { select: { name: true } },
          branch: { select: { name: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 15,
      });

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

    const pendingPhotos = await prisma.photoCheckSubmission.findMany({
      where: { status: 'pending_qc' },
      include: { employee: { select: { name: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 20,
    });

    const [pendingQc, pendingLeave, pendingAdvances, pendingQcForms] = await Promise.all([
      pendingQcPromise,
      pendingLeavePromise,
      pendingAdvancesPromise,
      pendingQcFormsPromise,
    ]);

    const items = [
      ...pendingPhotos.map((p) => ({
        id: `photo-${p.id}`,
        type: 'photo_review',
        title: p.employee.name,
        href: '/dashboard/photo-review',
      })),
      ...pendingQcForms.map((f) => ({
        id: `qcform-${f.id}`,
        type: 'qc_form_submitted' as const,
        title: f.template.title,
        subtitle: `${f.employee.name} · ${f.branch.name}`,
        href: `/dashboard/forms#forms-review-submission-${f.id}`,
      })),
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
    if (isTransientDbError(e)) {
      logErrorThrottled(
        'api:review-notifications',
        () => console.error('[review-notifications GET] transient after retries', e),
        5 * 60 * 1000
      );
    } else {
      console.error('[review-notifications GET]', e);
    }
    return Response.json({ total: 0, items: [] }, { status: 200 });
  }
}

