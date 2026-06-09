function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type FetchWithRetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (info: { attempt: number; attempts: number; status?: number }) => void;
  /** When set, controls which HTTP statuses trigger another attempt. */
  retryOnStatuses?: (status: number) => boolean;
};

function defaultRetryOnStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function retryDelayMs(attemptIndex: number, baseDelayMs: number, maxDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** attemptIndex, maxDelayMs);
}

/** Client fetch helper — retries brief 5xx/429 blips so UI recovers without a full reload. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  attemptsOrOptions: number | FetchWithRetryOptions = 3
): Promise<Response> {
  const options: FetchWithRetryOptions =
    typeof attemptsOrOptions === 'number' ? { attempts: attemptsOrOptions } : attemptsOrOptions;
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 150;
  const maxDelayMs = options.maxDelayMs ?? 2500;
  const shouldRetryStatus = options.retryOnStatuses ?? defaultRetryOnStatus;

  let last: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(input, init);
      if (res.ok || !shouldRetryStatus(res.status)) return res;
      last = res;
    } catch {
      // network error — retry
    }
    if (i < attempts - 1) {
      options.onRetry?.({ attempt: i + 1, attempts, status: last?.status });
      await sleep(retryDelayMs(i, baseDelayMs, maxDelayMs));
    }
  }
  return last ?? new Response(null, { status: 503, statusText: 'Service Unavailable' });
}
