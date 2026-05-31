import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { prisma } from '@/lib/prisma';
import { ReportsView } from '@/components/reports/ReportsView';
import { ReportsPageTitle } from '@/components/ReportsPageTitle';

export default async function ReportsPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;
  if (session.user.role !== 'owner') redirect('/dashboard');

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  return (
    <div>
      <ReportsPageTitle />
      <ReportsView branches={branches} />
    </div>
  );
}
