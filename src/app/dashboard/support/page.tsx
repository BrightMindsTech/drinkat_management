import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { normalizeUserRole } from '@/lib/formVisibility';
import { SupportReportsView } from '@/components/support/SupportReportsView';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;

  const role = normalizeUserRole(session.user.role);
  return <SupportReportsView isOwner={role === 'owner'} />;
}
