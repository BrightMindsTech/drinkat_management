import { canonicalUploadPath } from '@/lib/upload-path';

const blobByKey = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function cacheKey(src: string): string {
  return canonicalUploadPath(src) || src;
}

function isLocalPreview(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('data:');
}

async function tryFetchImage(src: string, cache: RequestCache): Promise<string | null> {
  const res = await fetch(src, { credentials: 'include', cache });
  if (!res.ok) return null;
  const blob = await res.blob();
  const type = (blob.type || '').toLowerCase();
  if (type && !type.startsWith('image/') && type !== 'application/octet-stream') return null;
  return URL.createObjectURL(blob);
}

async function fetchAsObjectUrl(src: string): Promise<string | null> {
  const key = cacheKey(src);
  const hit = blobByKey.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;
  const run = (async () => {
    try {
      // Never HTTP-cache 401 JSON — Safari/WKWebView will reuse it and photos stay blank.
      let url = await tryFetchImage(src, 'no-store');
      if (!url) url = await tryFetchImage(src, 'reload');
      if (!url) return null;
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
