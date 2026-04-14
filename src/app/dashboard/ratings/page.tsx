import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { WeeklyRatingsClient } from '@/components/ratings/WeeklyRatingsClient';

export default async function RatingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner') redirect('/dashboard');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <WeeklyRatingsClient />
    </div>
  );
}
