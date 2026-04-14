import { prisma } from '@/lib/prisma';
import { purgeExpiredChat } from '@/lib/chat-retention';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';

/**
 * Authenticated with CRON_SECRET (query `?secret=` or `Authorization: Bearer`).
 * Runs away-session expiry **and** chat retention purge.
 * Chat retention also runs automatically (throttled) when anyone loads Messages — no URL schedule required.
 * This endpoint is optional: use it if you already ping it for away-session processing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 501 });
  }
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : new URL(req.url).searchParams.get('secret');
  if (token !== secret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const awayProcessed = await processExpiredAwaySessions();

  let chat: { messagesDeleted: number; threadsDeleted: number; typingDeleted: number } | null = null;
  try {
    chat = await purgeExpiredChat(prisma);
  } catch (e) {
    console.error('[cron/time-clock] chat purge failed', e);
  }

  return Response.json({
    ok: true,
    processed: awayProcessed,
    chat,
  });
}
