import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { userParticipatesInThread } from '@/lib/chat-thread';

const TYPING_TTL_MS = 5000;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: threadId } = await ctx.params;
    const ok = await userParticipatesInThread(prisma, threadId, session.user.id);
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

    const since = new Date(Date.now() - TYPING_TTL_MS);
    const rows = await prisma.chatTypingState.findMany({
      where: {
        threadId,
        userId: { not: session.user.id },
        updatedAt: { gte: since },
      },
      select: { userId: true },
    });

    return Response.json({ typingUserIds: rows.map((r) => r.userId) });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/typing GET]', e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}

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

    await prisma.chatTypingState.upsert({
      where: { threadId_userId: { threadId, userId: session.user.id } },
      create: { threadId, userId: session.user.id },
      update: { updatedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/typing POST]', e);
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
