import { createHmac, timingSafeEqual } from 'crypto';
import { uploadKeyFromPath } from '@/lib/ai-images';

/** Keep HMAC off `auth.ts` so image GETs do not boot Prisma. */
function uploadHmacSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'dev-insecure-nextauth-secret';
}

/** Long enough for a shift + next-day review; still expires so leaked links die. */
export const UPLOAD_SIGN_TTL_SEC = 7 * 24 * 60 * 60;

function hmac(message: string): string {
  return createHmac('sha256', uploadHmacSecret()).update(message).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function canonicalUploadPath(filePath: string): string {
  return String(filePath ?? '').trim().split('#')[0]?.split('?')[0] ?? '';
}

export function signStoredUploadPath(filePath: string, ttlSec = UPLOAD_SIGN_TTL_SEC): string {
  const clean = canonicalUploadPath(filePath);
  const key = uploadKeyFromPath(clean);
  if (!key) return filePath;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = hmac(`${key}.${exp}`);
  // One query param: Capacitor/WKWebView has dropped everything after `&` on `<img>` requests.
  return `${clean}?u=${encodeURIComponent(`${exp}.${sig}`)}`;
}

export function verifyUploadSignatureFromSearch(objectKey: string, search: URLSearchParams): boolean {
  const packed = search.get('u');
  if (packed) {
    let raw = packed;
    try {
      raw = decodeURIComponent(packed);
    } catch {
      raw = packed;
    }
    const dot = raw.indexOf('.');
    if (dot > 0) {
      return verifyUploadSignature(objectKey, raw.slice(0, dot), raw.slice(dot + 1));
    }
  }
  return verifyUploadSignature(objectKey, search.get('exp'), search.get('sig'));
}

export function verifyUploadSignature(objectKey: string, expRaw: string | null, sigRaw: string | null): boolean {
  if (!objectKey || !expRaw || !sigRaw) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(`${objectKey}.${exp}`);
  let given = sigRaw;
  try {
    given = decodeURIComponent(sigRaw);
  } catch {
    given = sigRaw;
  }
  return safeEqual(expected, given);
}

export function signUploadUrlsDeep<T>(value: T): T {
  if (typeof value === 'string') {
    const s = value;
    if (s.includes('/api/uploads/') || s.startsWith('/uploads/')) {
      return signStoredUploadPath(s) as T;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => signUploadUrlsDeep(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = signUploadUrlsDeep(v);
    }
    return out as T;
  }
  return value;
}

export function signUploadUrlsInJsonString(raw: string | null | undefined): string {
  if (!raw) return raw ?? '';
  try {
    return JSON.stringify(signUploadUrlsDeep(JSON.parse(raw)));
  } catch {
    return raw;
  }
}
