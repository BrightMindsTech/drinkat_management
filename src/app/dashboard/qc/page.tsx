import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { QCReviewView } from '@/components/qc/QCReviewView';
import { QCStaffView } from '@/components/qc/QCStaffView';
import { QCPageTitle } from '@/components/QCPageTitle';
import { NoEmployeeMessage } from '@/components/NoEmployeeMessage';

export default async function QCPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const role = session.user.role;

  if (role === 'owner' || role === 'qc') {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) {
    return (
      <div>
        <QCPageTitle variant="review" />
        <NoEmployeeMessage type="qc" />
      </div>
    );
  }
  const assignments = await prisma.checklistAssignment.findMany({
    where: { employeeId: user.employee.id },
    include: {
      checklist: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      branch: true,
    },
  });
  const submissions = await prisma.qcSubmission.findMany({
    where: { employeeId: user.employee.id },
    include: { assignment: { include: { checklist: true } }, photos: true },
    orderBy: { submittedAt: 'desc' },
  });
  return (
    <div>
      <QCPageTitle variant="staff" />
      <QCStaffView assignments={assignments} submissions={submissions} />
    </div>
  );
}
