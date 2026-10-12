import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { DEFAULT_WEIGHTS } from '@/lib/kpi-engine';
import { z } from 'zod';

const schema = z.object({
  subjectRole: z.enum(['staff', 'assistant_manager', 'manager']),
  weights: z.record(z.number()),
});

export const GET = withApiErrors(async function GET() {
  await requireOwner();
  const rows = await prisma.kpiWeightConfig.findMany({ orderBy: [{ subjectRole: 'asc' }, { versionNumber: 'desc' }] });
  return Response.json({ defaults: DEFAULT_WEIGHTS, versions: rows });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireOwner();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const latest = await prisma.kpiWeightConfig.findFirst({
    where: { subjectRole: parsed.data.subjectRole },
    orderBy: { versionNumber: 'desc' },
  });
  const created = await prisma.kpiWeightConfig.create({
    data: {
      subjectRole: parsed.data.subjectRole,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      weightsJson: JSON.stringify(parsed.data.weights),
      createdById: session.user.id,
    },
  });
  return Response.json(created);
});
