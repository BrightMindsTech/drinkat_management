const AUTH_SESSION_PATH = '/api/auth/session';
const AUTH_CSRF_PATH = '/api/auth/csrf';

export function isNextAuthClientPath(url: string): boolean {
  return url.includes(AUTH_SESSION_PATH) || url.includes(AUTH_CSRF_PATH);
}

/** Retry transient network failures (refresh abort, Worker cold start) for NextAuth client routes. */
export async function fetchWithAuthSessionRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchImpl?: typeof fetch
): Promise<Response> {
  const runFetch = fetchImpl ?? fetch;
  const url =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);
  const retryable = isNextAuthClientPath(url);
  const attempts = retryable ? 4 : 1;

  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await runFetch(input, init);
    } catch (error) {
      lastError = error;
      if (!retryable || i === attempts - 1) throw error;
      await new Promise((r) => setTimeout(r, 120 * (i + 1)));
    }
  }
  throw lastError;
}

export async function fetchAuthSession(): Promise<{ ok: boolean; hasUser: boolean; status: number }> {
  try {
    const res = await fetchWithAuthSessionRetry(AUTH_SESSION_PATH, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, hasUser: false, status: res.status };
    const data = (await res.json()) as { user?: unknown };
    return { ok: true, hasUser: !!data?.user, status: res.status };
  } catch {
    return { ok: false, hasUser: false, status: 0 };
  }
}
