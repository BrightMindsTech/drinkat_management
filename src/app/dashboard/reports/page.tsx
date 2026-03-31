import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReportsView } from '@/components/reports/ReportsView';
import { ReportsPageTitle } from '@/components/ReportsPageTitle';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'owner') redirect('/dashboard');

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  return (
    <div>
      <ReportsPageTitle />
      <ReportsView branches={branches} />
    </div>
  );
}
