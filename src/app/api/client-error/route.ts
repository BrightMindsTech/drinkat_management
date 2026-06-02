/** POST when a user-visible error screen appears — shows up in Cloudflare Workers Logs. */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body ok */
  }

  const path = typeof body.path === 'string' ? body.path : '';
  const digest = typeof body.digest === 'string' ? body.digest : '';
  const message = typeof body.message === 'string' ? body.message : '';
  const kind = typeof body.kind === 'string' ? body.kind : 'unknown';

  // Structured single line — search Cloudflare with: $metadata.message : client-visible-error
  // Intentionally logged at error level so it appears in Cloudflare Workers Logs.
  console.error(
    '[client-visible-error]',
    JSON.stringify({
      kind,
      path,
      href: typeof body.href === 'string' ? body.href.slice(0, 260) : null,
      digest: digest || null,
      message: message.slice(0, 500) || null,
      online: typeof body.online === 'boolean' ? body.online : null,
      visibilityState:
        typeof body.visibilityState === 'string' ? body.visibilityState.slice(0, 24) : null,
      connectionType:
        typeof body.connectionType === 'string' ? body.connectionType.slice(0, 24) : null,
      userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 160) : null,
      at: new Date().toISOString(),
    })
  );

  return Response.json({ ok: true });
}
