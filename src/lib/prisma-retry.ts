import { logErrorThrottled } from '@/lib/log-throttle';

const TRANSIENT_PATTERNS = [
  /SQLITE_BUSY/i,
  /SQLITE_LOCKED/i,
  /D1_ERROR/i,
  /D1 DB/i,
  /too many requests/i,
  /rate limit/i,
  /timeout/i,
  /timed out/i,
  /network/i,
  /connection lost/i,
  /Invalid array buffer length/i,
  /ECONNRESET/i,
  /503/,
  /502/,
  /504/,
  /failed to fetch/i,
  /Cloudflare request context is not available/i,
];

export function isTransientDbError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  return TRANSIENT_PATTERNS.some((re) => re.test(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attemptIndex: number, baseDelayMs: number): number {
  return Math.min(baseDelayMs * 2 ** attemptIndex, 2000);
}

/** Retry D1/Prisma reads on brief Cloudflare blips (common cause of dashboard SSR crashes). */
export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  attempts = 6,
  baseDelayMs = 100
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      const retryable = isTransientDbError(error);
      if (!retryable || i === attempts - 1) throw error;
      await sleep(retryDelayMs(i, baseDelayMs));
    }
  }
  throw last;
}

/** SSR/page loaders: retry transient D1 failures, then fall back without crashing the page. */
export async function withPrismaRetryOrFallback<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await withPrismaRetry(fn);
  } catch (error) {
    logErrorThrottled(
      `ssr:${label}`,
      () => console.error(`[${label}] failed after retries`, error),
      5 * 60 * 1000
    );
    return fallback;
  }
}
