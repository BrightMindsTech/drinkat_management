import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { DashboardHomeContent } from '@/components/dashboard/DashboardHomeContent';

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  const role = normalizeUserRole(session?.user?.role);

  return <DashboardHomeContent email={session?.user?.email ?? ''} role={role} />;
}
