import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { maybePurgeChatIfDue } from '@/lib/chat-retention';
import { canUsersChat, roleMayUseChat } from '@/lib/chat-policy';
import { createDirectThread, findDirectThreadForPair, listThreadsForUser } from '@/lib/chat-thread';

const postSchema = z.object({
  otherUserId: z.string().min(1),
});

export async function GET() {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    await maybePurgeChatIfDue(prisma);
    const threads = await listThreadsForUser(prisma, session.user.id);
    return Response.json({ threads });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/threads GET]', e);
    return Response.json({ error: 'Failed to load threads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
    }

    const { otherUserId } = parsed.data;
    const gate = await canUsersChat(prisma, session.user.id, otherUserId);
    if (!gate.ok) {
      return Response.json({ error: 'You cannot start a chat with this user' }, { status: 403 });
    }

    const existing = await findDirectThreadForPair(prisma, session.user.id, otherUserId);
    if (existing) {
      return Response.json({ threadId: existing.id, created: false });
    }

    const row = await createDirectThread(prisma, session.user.id, otherUserId);
    return Response.json({ threadId: row.id, created: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/threads POST]', e);
    return Response.json({ error: 'Failed to create thread' }, { status: 500 });
  }
}
