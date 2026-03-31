import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { saveUploadedFile } from '@/lib/upload-storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  if (session.user.role === 'owner') {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return new Response(null, { status: 404 });
  } else {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee || user.employee.id !== id) return new Response(null, { status: 403 });
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: id },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(documents);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return new Response(null, { status: 404 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string | null) || 'Document';

  if (!file) return Response.json({ error: 'file required' }, { status: 400 });

  let filePath: string;
  try {
    filePath = (await saveUploadedFile(file)).filePath;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return Response.json({ error: message }, { status: 503 });
  }

  const doc = await prisma.employeeDocument.create({
    data: { employeeId: id, filePath, title },
  });
  return Response.json(doc);
}
