import { requireSession } from '@/lib/session';

/** Client-reported push diagnostics when reconnect fails (visible in Cloudflare Logs). */
export async function POST(req: Request) {
  const session = await requireSession();
  const userId = (session.user as { id?: string }).id ?? null;
  const email = session.user.email ?? null;

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
      email,
      userId,
      diagnostic: body.diagnostic ?? {},
      at: new Date().toISOString(),
    })
  );

  return Response.json({ ok: true });
}
