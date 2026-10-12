import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePhotoOpsAdmin, requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

export const GET = withApiErrors(async function GET() {
  await requireCapability('qc:review').catch(() => requirePhotoOpsAdmin());
  const types = await prisma.photoCheckType.findMany({
    include: { references: { orderBy: { createdAt: 'desc' } } },
    orderBy: { sortOrder: 'asc' },
  });
  return Response.json({ types });
});

const patchSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  criteriaJson: z.string().optional(),
  titleEn: z.string().optional(),
  titleAr: z.string().optional(),
});

export const PATCH = withApiErrors(async function PATCH(req: NextRequest) {
  await requirePhotoOpsAdmin();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'id required' }, { status: 400 });
  const { id, ...data } = parsed.data;
  if (data.active === true) {
    const existing = await prisma.photoCheckType.findUnique({ where: { id } });
    if (existing?.provisional) {
      return Response.json({ error: 'Provisional types stay inactive until the Owner confirms the title' }, { status: 400 });
    }
  }
  const row = await prisma.photoCheckType.update({ where: { id }, data });
  return Response.json({ type: row });
});
