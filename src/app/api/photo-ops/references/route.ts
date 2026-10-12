import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

const schema = z.object({
  typeId: z.string(),
  uploadPath: z.string().min(4),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('qc:review');
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'typeId and uploadPath required' }, { status: 400 });
  const type = await prisma.photoCheckType.findUnique({ where: { id: parsed.data.typeId } });
  if (!type) return Response.json({ error: 'Type not found' }, { status: 404 });
  const row = await prisma.photoCheckReference.create({
    data: {
      typeId: parsed.data.typeId,
      uploadPath: parsed.data.uploadPath,
      approved: false,
      createdById: session.user.id,
    },
  });
  return Response.json({ reference: row });
});

const approveSchema = z.object({
  id: z.string(),
  approved: z.boolean(),
});

export const PATCH = withApiErrors(async function PATCH(req: NextRequest) {
  const session = await requireCapability('qc:review');
  const parsed = approveSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'id required' }, { status: 400 });
  const row = await prisma.photoCheckReference.update({
    where: { id: parsed.data.id },
    data: parsed.data.approved
      ? { approved: true, approvedById: session.user.id, approvedAt: new Date() }
      : { approved: false, approvedById: null, approvedAt: null },
  });
  return Response.json({ reference: row });
});
