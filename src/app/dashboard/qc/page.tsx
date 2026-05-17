import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QCReviewView } from '@/components/qc/QCReviewView';
import { QcUnderReviewView } from '@/components/qc/QcUnderReviewView';
import { QCPageTitle } from '@/components/QCPageTitle';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isQcReviewerUser } from '@/lib/qc-reviewer';

export default async function QCPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const role = normalizeUserRole(session.user.role);
  if (role === 'marketing') redirect('/dashboard/forms');

  const userForQc = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });
  const qcReview = isQcReviewerUser(session.user.role, userForQc?.employee ?? null);

  if (!qcReview) {
    return <QcUnderReviewView />;
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
