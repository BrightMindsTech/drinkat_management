import { readFile } from 'fs/promises';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { contentTypeForKey } from '@/lib/upload-storage';
import { getR2UploadsBucket } from '@/lib/r2-env';

/**
 * Serve uploaded blobs: R2 in production, filesystem in local dev.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ segments?: string[] }> }
) {
  const { segments } = await context.params;
  const key = segments?.join('/') ?? '';
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const { env } = getCloudflareContext({ async: false });
    const bucket = getR2UploadsBucket(env as CloudflareEnv);
    if (bucket) {
      const obj = await bucket.get(key);
      if (!obj) return new Response('Not found', { status: 404 });
      const ct =
        obj.httpMetadata?.contentType ?? contentTypeForKey(key, 'application/octet-stream');
      return new Response(obj.body, {
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch {
    // fall through to local file
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', key);
  try {
    const buf = await readFile(filePath);
    return new Response(buf, {
      headers: {
        'Content-Type': contentTypeForKey(key, 'application/octet-stream'),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
