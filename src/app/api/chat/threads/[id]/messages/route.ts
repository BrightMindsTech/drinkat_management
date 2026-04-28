import { after } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { roleMayUseChat } from '@/lib/chat-policy';
import { loadThreadWithTwoParticipants, touchThreadUpdatedAt, userParticipatesInThread } from '@/lib/chat-thread';
import { sendPushToUser } from '@/lib/push';

const postSchema = z.object({
  body: z.string().min(1).max(4000),
});

const PAGE = 50;

function originFromRequest(req: Request) {
  const u = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? u.host;
  const proto = (req.headers.get('x-forwarded-proto') ?? u.protocol.replace(':', '')).split(',')[0]?.trim();
  const p = proto && proto.length > 0 ? proto : 'https';
  return `${p}://${host}`;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: threadId } = await ctx.params;
    const ok = await userParticipatesInThread(prisma, threadId, session.user.id);
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

    const thread = await loadThreadWithTwoParticipants(prisma, threadId);
    if (!thread || thread.participants.length !== 2) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const other = thread.participants.find((p) => p.userId !== session.user.id);
    const peerLastReadAt = other?.lastReadAt?.toISOString() ?? null;

    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');
    const where: { threadId: string; createdAt?: { lt: Date } } = { threadId };
    if (cursor) {
      const cur = await prisma.chatMessage.findUnique({ where: { id: cursor }, select: { createdAt: true } });
      if (cur) where.createdAt = { lt: cur.createdAt };
    }

    const rows = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE,
      select: { id: true, body: true, createdAt: true, senderUserId: true },
    });

    const chronological = [...rows].reverse();
    const messages = chronological.map((m) => {
      const mine = m.senderUserId === session.user.id;
      const readByPeer =
        mine && other?.lastReadAt != null && m.createdAt.getTime() <= other.lastReadAt.getTime();
      return {
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        senderUserId: m.senderUserId,
        readByPeer,
      };
    });

    const nextCursor = rows.length === PAGE ? rows[rows.length - 1]?.id : null;

    return Response.json({ messages, peerLastReadAt, nextCursor });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/messages GET]', e);
    return Response.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (!roleMayUseChat(role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: threadId } = await ctx.params;
    const ok = await userParticipatesInThread(prisma, threadId, session.user.id);
    if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });

    const raw = await req.json().catch(() => ({}));
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 });
    }

    const body = parsed.data.body.trim();
    if (!body) return Response.json({ error: 'Message cannot be empty' }, { status: 400 });

    const msg = await prisma.chatMessage.create({
      data: {
        id: crypto.randomUUID(),
        threadId,
        senderUserId: session.user.id,
        body,
      },
      select: { id: true, body: true, createdAt: true, senderUserId: true },
    });

    await touchThreadUpdatedAt(prisma, threadId);

    const thread = await loadThreadWithTwoParticipants(prisma, threadId);
    const recipientIds =
      thread?.participants.filter((p) => p.userId !== session.user.id).map((p) => p.userId) ?? [];
    const origin = originFromRequest(req);
    const deepLink = `${origin}/dashboard/messages?thread=${encodeURIComponent(threadId)}`;

    // Use after() so Cloudflare Workers keep the isolate alive (waitUntil); fire-and-forget promises are often cut off when the response is sent.
    after(async () => {
      try {
        for (const uid of recipientIds) {
          const subs = await prisma.pushSubscription.findMany({ where: { userId: uid } });
          if (subs.length === 0) continue;
          await sendPushToUser(uid, subs, {
            title: 'You have new messages',
            body: 'Open the app to read your chat.',
            data: { type: 'chat_message', url: deepLink, threadId },
          });
        }
      } catch (pushErr) {
        console.error('[chat/messages POST] push', pushErr);
      }
    });

    return Response.json({
      message: {
        id: msg.id,
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
        senderUserId: msg.senderUserId,
        readByPeer: false,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('[chat/messages POST]', e);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
