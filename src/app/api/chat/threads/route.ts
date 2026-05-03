import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { maybePurgeChatIfDue } from '@/lib/chat-retention';
import { canUsersChat, roleMayUseChat, validateGroupParticipants } from '@/lib/chat-policy';
import {
  createDirectThread,
  createGroupThread,
  findDirectThreadForPair,
  listThreadsForUser,
} from '@/lib/chat-thread';

const dmSchema = z.object({
  otherUserId: z.string().min(1),
});

const groupSchema = z.object({
  kind: z.literal('group'),
  participantIds: z.array(z.string().min(1)).min(2).max(50),
  title: z
    .string()
    .max(120)
    .optional()
    .transform((s) => s?.trim() || undefined),
});

const postSchema = z.union([
  dmSchema,
  groupSchema,
]);

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

    if ('otherUserId' in parsed.data) {
      const { otherUserId } = parsed.data;
      const gate = await canUsersChat(prisma, session.user.id, otherUserId);
      if (!gate.ok) {
        return Response.json({ error: 'You cannot start a chat with this user' }, { status: 403 });
      }

      const existing = await findDirectThreadForPair(prisma, session.user.id, otherUserId);
      if (existing) {
        return Response.json({ threadId: existing.id, created: false, kind: 'direct' });
      }

      const row = await createDirectThread(prisma, session.user.id, otherUserId);
      return Response.json({ threadId: row.id, created: true, kind: 'direct' });
    }

    const { participantIds, title } = parsed.data;
    const v = await validateGroupParticipants(prisma, session.user.id, participantIds);
    if (!v.ok) {
      return Response.json({ error: v.error }, { status: 400 });
    }
    const others = [...new Set(participantIds)].filter((id) => id !== session.user.id);
    const row = await createGroupThread(prisma, session.user.id, others, title);
    return Response.json({ threadId: row.id, created: true, kind: 'group' });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/threads POST]', e);
    return Response.json({ error: 'Failed to create thread' }, { status: 500 });
  }
}
