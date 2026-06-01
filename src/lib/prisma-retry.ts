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

/** Retry D1/Prisma reads on brief Cloudflare blips (common cause of dashboard SSR crashes). */
export async function withPrismaRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      const retryable = isTransientDbError(error);
      if (!retryable || i === attempts - 1) throw error;
      await sleep(80 * (i + 1));
    }
  }
  throw last;
}
