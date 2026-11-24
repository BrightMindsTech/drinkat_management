import { canonicalUploadPath } from '@/lib/upload-signed-url';

const blobByKey = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(src: string): string {
  return canonicalUploadPath(src) || src;
}

function isLocalPreview(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

async function fetchAsObjectUrl(src: string): Promise<string | null> {
  const key = cacheKey(src);
  const hit = blobByKey.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;
  const run = (async () => {
    try {
      const res = await fetch(src, { credentials: 'include', cache: 'force-cache' });
      if (!res.ok) return null;
      const blob = await res.blob();
      const type = (blob.type || '').toLowerCase();
      if (type && !type.startsWith('image/') && type !== 'application/octet-stream') return null;
      const url = URL.createObjectURL(blob);
      blobByKey.set(key, url);
      return url;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

/** WKWebView often omits cookies on `<img src>` but includes them on fetch(). */
export function loadCredentialedImage(src: string | null | undefined): Promise<string | null> {
  const raw = String(src ?? '').trim();
  if (!raw) return Promise.resolve(null);
  if (isLocalPreview(raw)) return Promise.resolve(raw);
  return fetchAsObjectUrl(raw);
}
