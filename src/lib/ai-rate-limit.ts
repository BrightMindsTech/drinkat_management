type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Per-user AI budget: 12 requests / 10 minutes. */
export function consumeAiUserQuota(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = 10 * 60_000;
  const max = 12;
  const key = `ai:${userId}`;
  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true };
}
