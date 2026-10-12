import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getR2UploadsBucket } from '@/lib/r2-env';
import { AiUnavailableError } from '@/lib/ai-provider';

export function uploadKeyFromPath(filePath: string): string | null {
  const raw = String(filePath ?? '').trim();
  const api = raw.match(/\/api\/uploads\/(.+)$/);
  if (api?.[1] && !api[1].includes('..')) return api[1];
  const local = raw.match(/^\/uploads\/(.+)$/);
  if (local?.[1] && !local[1].includes('..')) return local[1];
  return null;
}

export async function loadInspectionImage(filePath: string): Promise<{ mime: string; base64: string }> {
  const key = uploadKeyFromPath(filePath);
  if (!key) {
    throw new AiUnavailableError('invalid_image', 'Inspection photograph path is invalid.', 400);
  }
  try {
    const { env } = getCloudflareContext({ async: false });
    const bucket = getR2UploadsBucket(env as CloudflareEnv);
    if (bucket) {
      const obj = await bucket.get(key);
      if (!obj) throw new AiUnavailableError('invalid_image', 'Inspection photograph was not found.', 400);
      const bytes = await obj.arrayBuffer();
      const mime = obj.httpMetadata?.contentType || mimeFromKey(key);
      if (!mime.startsWith('image/')) {
        throw new AiUnavailableError('invalid_image', 'File is not an image.', 400);
      }
      return { mime, base64: bufferToBase64(bytes) };
    }
  } catch (e) {
    if (e instanceof AiUnavailableError) throw e;
  }
  throw new AiUnavailableError('invalid_image', 'Could not load the inspection photograph from storage.', 400);
}

function mimeFromKey(key: string): string {
  const ext = key.toLowerCase().split('.').pop();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function bufferToBase64(bytes: ArrayBuffer): string {
  const buf = Buffer.from(bytes);
  return buf.toString('base64');
}
