import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { normalizeUserRole } from '@/lib/formVisibility';
import { WeeklyRatingsClient } from '@/components/ratings/WeeklyRatingsClient';

export default async function RatingsPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner') redirect('/dashboard');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <WeeklyRatingsClient />
    </div>
  );
}
