import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };

type LimitTier = 'auth' | 'write' | 'read' | 'heavy';

const LIMITS: Record<LimitTier, { max: number; windowMs: number }> = {
  /** Login / session — stop credential spam from taking down the Worker. */
  auth: { max: 25, windowMs: 60_000 },
  /** POST/PATCH/DELETE — forms, clock, chat send, etc. */
  write: { max: 90, windowMs: 60_000 },
  /** Normal reads */
  read: { max: 240, windowMs: 60_000 },
  /** Large reports + frequent geofence posts */
  heavy: { max: 120, windowMs: 60_000 },
};

/** Never rate-limit routes that gate login or clock presence — shared shop Wi‑Fi hits one IP. */
const RATE_LIMIT_EXEMPT_PATHS = new Set([
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/time-clock/status',
  '/api/time-clock/presence-check',
  '/api/push/consent-status',
  '/api/push/opt-in',
]);

const globalStore = globalThis as typeof globalThis & {
  __drinkatRateLimit?: Map<string, Bucket>;
};

function getStore(): Map<string, Bucket> {
  if (!globalStore.__drinkatRateLimit) {
    globalStore.__drinkatRateLimit = new Map();
  }
  return globalStore.__drinkatRateLimit;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function tierForRequest(pathname: string, method: string): LimitTier | null {
  if (pathname.startsWith('/api/health/') || pathname.startsWith('/api/cron/')) {
    return null;
  }
  // Session/csrf polling must never 429 — shared IPs + focus refetch caused apparent random logouts.
  if (RATE_LIMIT_EXEMPT_PATHS.has(pathname)) {
    return null;
  }
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname === '/api/reports' && method === 'GET') return 'heavy';
  if (pathname.startsWith('/api/time-clock/location-event')) return 'heavy';
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'read';
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE' || method === 'PUT') {
    return 'write';
  }
  return 'read';
}

function pruneStore(store: Map<string, Bucket>, now: number) {
  if (store.size < 500) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

/**
 * Per-IP sliding window limiter for Edge middleware.
 * Best-effort on Workers (per-isolate); still stops button-spam crashes.
 */
export function applyRateLimit(req: Request): NextResponse | null {
  const pathname = new URL(req.url).pathname;
  if (!pathname.startsWith('/api/')) return null;

  const tier = tierForRequest(pathname, req.method);
  if (!tier) return null;

  const { max, windowMs } = LIMITS[tier];
  const ip = getClientIp(req);
  const key = `${tier}:${ip}`;
  const now = Date.now();
  const store = getStore();
  pruneStore(store, now);

  let bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > max) {
    const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      {
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfterSec: retrySec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retrySec),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return null;
}
