import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { prisma } from '@/lib/prisma';
import { QCReviewView } from '@/components/qc/QCReviewView';
import { QCStaffView } from '@/components/qc/QCStaffView';
import { QCPageTitle } from '@/components/QCPageTitle';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isQcReviewerUser } from '@/lib/qc-reviewer';

export default async function QCPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;

  const role = normalizeUserRole(session.user.role);
  if (role === 'marketing') redirect('/dashboard/forms');

  const userForQc = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });
  const qcReview = isQcReviewerUser(session.user.role, userForQc?.employee ?? null);

  if (!qcReview) {
    const employeeId = userForQc?.employee?.id;
    if (!employeeId) return <DashboardSessionRecovery />;

    const [assignments, submissions] = await Promise.all([
      prisma.checklistAssignment.findMany({
        where: { employeeId },
        include: {
          checklist: {
            include: {
              items: { orderBy: { sortOrder: 'asc' } },
            },
          },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.qcSubmission.findMany({
        where: { employeeId },
        include: {
          assignment: {
            include: {
              checklist: { select: { name: true } },
            },
          },
          photos: true,
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    return (
      <div>
        <QCPageTitle variant="staff" />
        <QCStaffView assignments={assignments} submissions={submissions} />
      </div>
    );
  }

  const [checklists, assignments, submissions, branches, employees] = await Promise.all([
    prisma.checklist.findMany({
      include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.checklistAssignment.findMany({
      include: {
        checklist: true,
        employee: { include: { branch: true } },
        branch: true,
      },
    }),
    prisma.qcSubmission.findMany({
      include: {
        assignment: {
          include: {
            checklist: true,
            employee: { include: { branch: true } },
            branch: true,
          },
        },
        employee: { include: { branch: true } },
        photos: true,
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.employee.findMany({
      where: { status: { in: ['active', 'on_leave'] } },
      include: { branch: true, department: true },
    }),
  ]);

  return (
    <div>
      <QCPageTitle variant="review" />
      <QCReviewView
        checklists={checklists}
        assignments={assignments}
        submissions={submissions}
        branches={branches}
        employees={employees}
      />
    </div>
  );
}
