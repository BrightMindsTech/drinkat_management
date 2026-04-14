import { prisma } from '@/lib/prisma';
import { purgeExpiredChat } from '@/lib/chat-retention';

/**
 * Optional HTTP trigger for chat retention (same purge as automatic + time-clock cron).
 * Retention normally runs **without** calling this: `GET /api/chat/threads` throttles a purge ~every 20h.
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

  try {
    const result = await purgeExpiredChat(prisma);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error('[cron/chat-cleanup]', e);
    return Response.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
