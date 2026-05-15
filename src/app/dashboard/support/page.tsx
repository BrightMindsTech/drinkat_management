import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { SupportReportsView } from '@/components/support/SupportReportsView';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const role = normalizeUserRole(session.user.role);
  return <SupportReportsView isOwner={role === 'owner'} />;
}
