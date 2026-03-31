import { writeFile, mkdir } from 'fs/promises';
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

export { contentTypeForKey };
