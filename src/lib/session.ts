import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { normalizeUserRole } from './formVisibility';

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (normalizeUserRole(session.user.role) !== 'owner')
    throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  return session;
}

export async function requireQc() {
  const session = await requireSession();
  const r = normalizeUserRole(session.user.role);
  if (r !== 'qc' && r !== 'owner') throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  return session;
}
