import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { prisma } from '@/lib/prisma';
import { HROwnerView } from '@/components/hr/HROwnerView';
import { HRPageTitle } from '@/components/HRPageTitle';
import { normalizeUserRole } from '@/lib/formVisibility';

export default async function HRPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;

  const role = normalizeUserRole(session.user.role);
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true },
  });
  const isOwner = role === 'owner';
  // Team & Access: owner or flagged HR (Sara). Payroll/leave APIs stay frozen.
  if (!isOwner && !actor?.hrKpiReviewer) redirect('/dashboard');

  const [employees, branches, departments] = await Promise.all([
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
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <HRPageTitle variant="owner" />
      <HROwnerView
        initialEmployees={employees}
        branches={branches}
        departments={departments}
        showOwnerTools={isOwner}
      />
    </div>
  );
}
