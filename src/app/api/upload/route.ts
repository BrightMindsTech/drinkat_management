import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveUploadedFile } from '@/lib/upload-storage';
import { recordUploadObject } from '@/lib/upload-access';
import { PHOTO_UPLOAD_MAX_BYTES } from '@/lib/photo-multi';

const ALLOWED = /^(image\/(jpeg|jpg|png|webp|gif|heic|heif)|application\/pdf)$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: 'file required' }, { status: 400 });
  if (file.size > PHOTO_UPLOAD_MAX_BYTES) return Response.json({ error: 'file too large (max 8MB)' }, { status: 400 });
  const type = file.type || '';
  if (type && !ALLOWED.test(type)) {
    return Response.json({ error: 'unsupported file type' }, { status: 400 });
  }

  try {
    const { filePath } = await saveUploadedFile(file);
    await recordUploadObject(prisma, filePath, session.user.id);
    return Response.json({ url: filePath, filePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return Response.json({ error: message }, { status: 503 });
  }
}
