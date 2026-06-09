import { fetchWithRetry, type FetchWithRetryOptions } from '@/lib/fetch-with-retry';

export type SubmitJsonResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; data: unknown; response: Response };

const SUBMIT_ATTEMPTS = 10;

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429 || status === 408;
}

async function readJsonBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * POST/PUT/PATCH helper for critical user actions (leave, advances, etc.).
 * Retries transient server/network failures until success or attempts are exhausted.
 */
export async function submitJsonWithRetry<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<SubmitJsonResult<T>> {
  const attempts = options.attempts ?? SUBMIT_ATTEMPTS;
  const res = await fetchWithRetry(
    input,
    { credentials: 'include', ...init },
    {
      ...options,
      attempts,
      retryOnStatuses: isRetryableStatus,
    }
  );
  const data = (await readJsonBody(res)) as T;
  if (res.ok) return { ok: true, data, response: res };
  return { ok: false, data, response: res };
}
