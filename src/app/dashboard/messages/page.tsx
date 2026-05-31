import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getDashboardSession } from '@/lib/dashboard-session';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { MessagesClient } from '@/components/messages/MessagesClient';

export default async function MessagesPage() {
  const session = await getDashboardSession();
  if (!session?.user?.id) return <DashboardSessionRecovery />;
  const role = normalizeUserRole(session.user.role);
  if (!roleMayUseChat(role)) redirect('/dashboard');

  return (
    <Suspense fallback={<p className="text-app-muted py-8">…</p>}>
      <MessagesClient currentUserId={session.user.id} />
    </Suspense>
  );
}
