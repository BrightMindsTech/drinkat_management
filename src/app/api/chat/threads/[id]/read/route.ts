import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { userParticipatesInThread } from '@/lib/chat-thread';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: threadId } = await ctx.params;
    const ok = await userParticipatesInThread(prisma, threadId, session.user.id);
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

    const now = new Date();
    await prisma.chatParticipant.update({
      where: { threadId_userId: { threadId, userId: session.user.id } },
      data: { lastReadAt: now },
    });

    return Response.json({ ok: true, lastReadAt: now.toISOString() });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/read]', e);
    return Response.json({ error: 'Failed to mark read' }, { status: 500 });
  }
}
