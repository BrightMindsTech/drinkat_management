import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getR2UploadsBucket } from '@/lib/r2-env';

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/** Workers have `navigator` but no `document` (same heuristic as prisma.ts). */
function isCloudflareWorkerLike(): boolean {
  const g = globalThis as { navigator?: unknown; document?: unknown };
  return typeof g.navigator !== 'undefined' && typeof g.document === 'undefined';
}

/** OpenNext dev polyfills `navigator` without R2 — still runs in Node; use local disk like prisma.ts. */
function isNodeJsRuntime(): boolean {
  return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
}

function extFromFilename(name: string): string {
  const e = path.extname(name);
  return e || '.bin';
}

function contentTypeForKey(key: string, fallback: string): string {
  if (fallback && fallback !== 'application/octet-stream') return fallback;
  const ext = path.extname(key).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * Save an uploaded file. On Cloudflare (R2 binding), stores in R2 and returns `/api/uploads/...`.
 * Locally, writes under `public/uploads` and returns `/uploads/...` (served by Next static).
 */
export async function saveUploadedFile(file: File): Promise<{ filePath: string }> {
  const ext = extFromFilename(file.name);
  const filename = `${randomUUID()}${ext}`;
  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);
  const ct = file.type || contentTypeForKey(filename, 'application/octet-stream');

  try {
    const { env } = getCloudflareContext({ async: false });
    const bucket = getR2UploadsBucket(env as CloudflareEnv);
    if (bucket) {
      await bucket.put(filename, buf, {
        httpMetadata: { contentType: ct },
      });
      const p = `/api/uploads/${filename}`;
      return { filePath: p };
    }
  } catch {
    // No Worker context (local next build / Node)
  }

  // Local `next dev`: filesystem. OpenNext sets Worker-like globals without R2 → 503 if we only
  // check `isCloudflareWorkerLike()`. Restrict to dev so Workers with `nodejs_compat` (Node-like
  // `process`) still require R2 when `UPLOADS` is missing.
  if (isNodeJsRuntime() && process.env.NODE_ENV === 'development') {
    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const filepath = path.join(LOCAL_UPLOAD_DIR, filename);
    await writeFile(filepath, buf);
    return { filePath: `/uploads/${filename}` };
  }

  if (isCloudflareWorkerLike()) {
    throw new Error(
      'Uploads require Cloudflare R2: enable R2 in the Cloudflare dashboard, create bucket drinkat-management-uploads, add the UPLOADS binding in wrangler.jsonc, then redeploy.'
    );
  }

  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const filepath = path.join(LOCAL_UPLOAD_DIR, filename);
  await writeFile(filepath, buf);
  return { filePath: `/uploads/${filename}` };
}

function keyFromFilePath(filePath: string): string | null {
  const apiPrefix = '/api/uploads/';
  const localPrefix = '/uploads/';
  if (filePath.startsWith(apiPrefix)) return filePath.slice(apiPrefix.length);
  if (filePath.startsWith(localPrefix)) return filePath.slice(localPrefix.length);
  return null;
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  const key = keyFromFilePath(filePath);
  if (!key) return;

  try {
    const { env } = getCloudflareContext({ async: false });
    const bucket = getR2UploadsBucket(env as CloudflareEnv);
    if (bucket) {
      await bucket.delete(key);
      return;
    }
  } catch {
    // No Worker context; fall back to local fs path.
  }

  const localPath = path.join(LOCAL_UPLOAD_DIR, key);
  try {
    await unlink(localPath);
  } catch {
    // Missing files are safe to ignore.
  }
}

export { contentTypeForKey };
