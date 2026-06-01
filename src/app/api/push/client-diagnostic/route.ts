import { requireSession } from '@/lib/session';

/** Client-reported push diagnostics when reconnect fails (visible in Cloudflare Logs). */
export async function POST(req: Request) {
  await requireSession();
  let body: { context?: string; diagnostic?: Record<string, unknown> } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* empty ok */
  }

  console.error(
    '[push-client-diagnostic]',
    JSON.stringify({
      context: body.context ?? 'unknown',
      diagnostic: body.diagnostic ?? {},
      at: new Date().toISOString(),
    })
  );

  return Response.json({ ok: true });
}
