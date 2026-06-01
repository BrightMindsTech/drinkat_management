type ClientVisibleError = {
  kind: string;
  path?: string;
  digest?: string;
  message?: string;
};

let lastKey = '';
let lastAt = 0;

/** Fire-and-forget report so user-visible crashes appear in Cloudflare Workers Logs. */
export function reportClientVisibleError(payload: ClientVisibleError): void {
  if (typeof window === 'undefined') return;

  const path = payload.path ?? window.location.pathname;
  const key = `${payload.kind}|${path}|${payload.digest ?? ''}|${payload.message ?? ''}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < 60_000) return;
  lastKey = key;
  lastAt = now;

  void fetch('/api/client-error', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      path,
      userAgent: navigator.userAgent,
    }),
  }).catch(() => {
    /* non-fatal */
  });
}
