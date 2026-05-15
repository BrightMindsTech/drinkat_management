import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { getChatUnreadTotal } from '@/lib/chat-thread';

export const dynamic = 'force-dynamic';

/** Lightweight unread badge for dashboard nav (avoids full thread list + side jobs). */
export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ total: 0 });
    }
    const total = await getChatUnreadTotal(prisma, session.user.id);
    return Response.json({ total });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/unread GET]', e);
    return Response.json({ error: 'Failed to load unread count' }, { status: 500 });
  }
}
