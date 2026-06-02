/** Avoid flooding Cloudflare logs when cron/health fail on a sustained D1 blip. */
const lastLoggedAt = new Map<string, number>();

const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000;

export function logErrorThrottled(
  key: string,
  logFn: () => void,
  cooldownMs = DEFAULT_COOLDOWN_MS
): void {
  const now = Date.now();
  const last = lastLoggedAt.get(key) ?? 0;
  if (now - last < cooldownMs) return;
  lastLoggedAt.set(key, now);
  logFn();
}
