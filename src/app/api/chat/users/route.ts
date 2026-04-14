import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { listChatEligiblePeers, roleMayUseChat } from '@/lib/chat-policy';

export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const users = await listChatEligiblePeers(prisma, session.user.id, session.user.role);
    return Response.json({ users });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/users]', e);
    return Response.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
