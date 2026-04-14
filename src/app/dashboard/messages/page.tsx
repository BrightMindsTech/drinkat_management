import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { MessagesClient } from '@/components/messages/MessagesClient';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  const role = normalizeUserRole(session.user.role);
  if (!roleMayUseChat(role)) redirect('/dashboard');

  return (
    <Suspense fallback={<p className="text-app-muted py-8">…</p>}>
      <MessagesClient currentUserId={session.user.id} />
    </Suspense>
  );
}
