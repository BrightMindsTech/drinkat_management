import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner, requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { normalizeUserRole } from '@/lib/permissions';
import { isSyntheticSopSource, isUnapprovableSopSource } from '@/lib/ai-sop';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  locale: z.enum(['en', 'ar']).default('en'),
  body: z.string().trim().min(1).max(20_000),
  sourceRef: z.string().trim().min(1).max(300),
  qcDomain: z.string().trim().min(1).max(80).optional(),
  approved: z.boolean().optional(),
});

export const GET = withApiErrors(async function GET() {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'qc') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const docs = await prisma.sopDocument.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      locale: true,
      sourceRef: true,
      approved: true,
      qcDomain: true,
      reviewStatus: true,
      createdAt: true,
      body: true,
    },
  });
  return Response.json({
    documents: docs.map((d) => ({
      ...d,
      synthetic: isSyntheticSopSource(d.sourceRef),
      unapprovable: isUnapprovableSopSource(d.sourceRef),
      draftNotApproved: !d.approved,
      bodyPreview: d.body.slice(0, 240),
      body: role === 'owner' || role === 'qc' ? d.body : undefined,
    })),
    approvedCount: docs.filter((d) => d.approved).length,
    sopAssistant: docs.some((d) => d.approved) ? 'available' : 'blocked',
    note: 'Listed rows may be DRAFT — NOT APPROVED. The SOP assistant uses approved=1 documents only.',
  });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requireOwner();
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const blocked = isUnapprovableSopSource(parsed.data.sourceRef);
  if (parsed.data.approved && blocked) {
    return Response.json(
      {
        error:
          'SYNTHETIC, DRAFT, and FDA-sourced documents cannot be marked approved. Ingest a validated DRINKAT SOP after QC sign-off.',
      },
      { status: 400 }
    );
  }
  const doc = await prisma.sopDocument.create({
    data: {
      title: parsed.data.title,
      locale: parsed.data.locale,
      body: parsed.data.body,
      sourceRef: parsed.data.sourceRef,
      qcDomain: parsed.data.qcDomain ?? null,
      approved: blocked ? false : parsed.data.approved === true,
      reviewStatus: 'draft',
    },
  });
  const approvedCount = await prisma.sopDocument.count({ where: { approved: true } });
  return Response.json({
    id: doc.id,
    approved: doc.approved,
    synthetic: isSyntheticSopSource(doc.sourceRef),
    unapprovable: blocked,
    sopAssistantStillBlocked: approvedCount === 0,
  });
});
