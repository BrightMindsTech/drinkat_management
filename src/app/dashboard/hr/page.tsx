import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HROwnerView } from '@/components/hr/HROwnerView';
import { HRStaffView } from '@/components/hr/HRStaffView';
import { HRManagerView } from '@/components/hr/HRManagerView';
import { HRPageTitle } from '@/components/HRPageTitle';
import { NoEmployeeMessage } from '@/components/NoEmployeeMessage';
import { normalizeUserRole } from '@/lib/formVisibility';

export default async function HRPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const role = normalizeUserRole(session.user.role);

  if (role === 'owner') {
    const [employees, advances, branches, departments, leaveRequests] = await Promise.all([
      prisma.employee.findMany({
        where: { status: { not: 'terminated' } },
        include: {
          branch: true,
          department: true,
          user: { select: { email: true } },
          transfers: { include: { fromBranch: true, toBranch: true }, orderBy: { transferredAt: 'desc' }, take: 10 },
          documents: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.advance.findMany({
        include: { employee: { include: { branch: true } } },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.branch.findMany({ orderBy: { name: 'asc' } }),
      prisma.department.findMany({ orderBy: { name: 'asc' } }),
      prisma.leaveRequest.findMany({
        include: { employee: { include: { branch: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return (
      <div>
        <HRPageTitle variant="owner" />
        <HROwnerView initialEmployees={employees} initialAdvances={advances} initialLeaveRequests={leaveRequests} branches={branches} departments={departments} />
      </div>
    );
  }

  if (role === 'manager') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: { include: { branch: true } } },
    });
    if (!user?.employee) {
      return (
        <div>
          <HRPageTitle variant="owner" />
          <NoEmployeeMessage type="hr" />
        </div>
      );
    }

    const managerEmployee = user.employee;
    const [teamAdvances, myAdvances, leaveRequests, teamEmployees, branches] = await Promise.all([
      prisma.advance.findMany({
        where: {
          employee: { reportsToEmployeeId: managerEmployee.id, branchId: managerEmployee.branchId },
        },
        include: { employee: { include: { branch: true } } },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.advance.findMany({
        where: { employeeId: managerEmployee.id },
        include: { employee: { include: { branch: true } } },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.leaveRequest.findMany({
        where: {
          employee: { reportsToEmployeeId: managerEmployee.id, branchId: managerEmployee.branchId },
        },
        include: { employee: { include: { branch: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.findMany({
        where: {
          reportsToEmployeeId: managerEmployee.id,
          branchId: managerEmployee.branchId,
          status: { in: ['active', 'on_leave'] },
        },
        include: { branch: true },
        orderBy: { name: 'asc' },
      }),
      prisma.branch.findMany({ where: { id: managerEmployee.branchId } }),
    ]);

    const teamIds = teamEmployees.map((e) => e.id);
    const teamReviews =
      teamIds.length === 0
        ? []
        : await prisma.performanceReview.findMany({
            where: { employeeId: { in: teamIds } },
            orderBy: { reviewedAt: 'desc' },
          });

    const reviewsByEmployeeId = teamReviews.reduce<Record<string, typeof teamReviews>>((acc, r) => {
      if (!acc[r.employeeId]) acc[r.employeeId] = [];
      acc[r.employeeId].push(r);
      return acc;
    }, {});

    return (
      <div>
        <HRPageTitle variant="owner" />
        <HRManagerView
          manager={managerEmployee}
          teamEmployees={teamEmployees}
          reviewsByEmployeeId={reviewsByEmployeeId}
          initialTeamAdvances={teamAdvances}
          initialMyAdvances={myAdvances}
          initialLeaveRequests={leaveRequests}
          branches={branches}
        />
      </div>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { branch: true } } },
  });
  if (!user?.employee) {
    return (
      <div>
        <HRPageTitle variant="owner" />
        <NoEmployeeMessage type="hr" />
      </div>
    );
  }
  const [advances, leaveRequests, documents, salaryHistory, reviews] = await Promise.all([
    prisma.advance.findMany({
      where: { employeeId: user.employee.id },
      include: { employee: { include: { branch: true } } },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.employee.id },
      include: { employee: { include: { branch: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employeeDocument.findMany({
      where: { employeeId: user.employee.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salaryCopy.findMany({
      where: { employeeId: user.employee.id },
      orderBy: { periodMonth: 'desc' },
    }),
    prisma.performanceReview.findMany({
      where: { employeeId: user.employee.id },
      orderBy: { reviewedAt: 'desc' },
    }),
  ]);
  return (
    <div>
      <HRPageTitle variant="staff" />
      <HRStaffView employee={user.employee} advances={advances} leaveRequests={leaveRequests} documents={documents} salaryHistory={salaryHistory} reviews={reviews} />
    </div>
  );
}
