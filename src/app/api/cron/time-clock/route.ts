import { processExpiredAwaySessions } from '@/lib/time-clock-process';

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

  const n = await processExpiredAwaySessions();
  return Response.json({ ok: true, processed: n });
}
