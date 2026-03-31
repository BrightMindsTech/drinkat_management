import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveUploadedFile } from '@/lib/upload-storage';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: 'file required' }, { status: 400 });

  try {
    const { filePath } = await saveUploadedFile(file);
    return Response.json({ url: filePath, filePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return Response.json({ error: message }, { status: 503 });
  }
}
