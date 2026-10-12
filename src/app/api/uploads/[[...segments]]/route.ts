import { readFile } from 'fs/promises';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { contentTypeForKey } from '@/lib/upload-storage';
import { getR2UploadsBucket } from '@/lib/r2-env';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { actorCanReadUpload } from '@/lib/upload-access';
import { normalizeUserRole } from '@/lib/permissions';

const PRIVATE_CACHE = 'private, no-store';

export const GET = withApiErrors(async function GET(
  _req: Request,
  context: { params: Promise<{ segments?: string[] }> }
) {
  const session = await requireSession();
  const { segments } = await context.params;
  const key = segments?.join('/') ?? '';
  if (!key || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const allowed = await actorCanReadUpload(prisma, {
    objectKey: key,
    userId: session.user.id,
    role: normalizeUserRole(session.user.role),
    employee: user?.employee ? { id: user.employee.id, branchId: user.employee.branchId } : null,
  });
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

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
          'Cache-Control': PRIVATE_CACHE,
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
        'Cache-Control': PRIVATE_CACHE,
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
});
