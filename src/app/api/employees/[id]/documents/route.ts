import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { saveUploadedFile } from '@/lib/upload-storage';
import { z } from 'zod';

const docTypeValues = ['criminal_record', 'contract', 'certificate', 'id_copy', 'other'] as const;
const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  documentType: z.enum(docTypeValues),
  documentNumber: z.string().trim().min(1).max(120),
  issuedOn: z.string().datetime(),
  expiresOn: z.string().datetime().optional(),
});

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
  const session = await requireSession();
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return new Response(null, { status: 404 });

  if (session.user.role !== 'owner') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employee: { select: { id: true } } },
    });
    if (!user?.employee || user.employee.id !== id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const raw = {
    title: String(formData.get('title') ?? ''),
    documentType: String(formData.get('documentType') ?? ''),
    documentNumber: String(formData.get('documentNumber') ?? ''),
    issuedOn: String(formData.get('issuedOn') ?? ''),
    expiresOn: formData.get('expiresOn') ? String(formData.get('expiresOn')) : undefined,
  };

  if (!file) return Response.json({ error: 'file required' }, { status: 400 });
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') || 'Invalid metadata' },
      { status: 400 }
    );
  }
  const { title, documentType, documentNumber, issuedOn, expiresOn } = parsed.data;
  const issuedOnDate = new Date(issuedOn);
  const expiresOnDate = expiresOn ? new Date(expiresOn) : null;
  if (expiresOnDate && expiresOnDate < issuedOnDate) {
    return Response.json({ error: 'expiresOn must be on or after issuedOn' }, { status: 400 });
  }

  let filePath: string;
  try {
    filePath = (await saveUploadedFile(file)).filePath;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return Response.json({ error: message }, { status: 503 });
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId: id,
      filePath,
      title,
      documentType,
      documentNumber,
      issuedOn: issuedOnDate,
      expiresOn: expiresOnDate,
    },
  });
  return Response.json(doc);
}
