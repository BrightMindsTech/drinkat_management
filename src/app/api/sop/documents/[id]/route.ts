import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { normalizeUserRole } from '@/lib/permissions';
import {
  canAdoptSopSource,
  canApproveSopSource,
  DRINKAT_ADOPTED_PREFIX,
  isSyntheticSopSourceRef,
  isUnapprovableSopSource,
  JORDAN_SOP_LEGAL_AR,
  JORDAN_SOP_LEGAL_EN,
} from '@/lib/drinkat-sop-drafts';
import { z } from 'zod';

const REVIEW = ['draft', 'qc_reviewed', 'needs_info', 'rejected'] as const;

const patchSchema = z.object({
  action: z.enum(['review', 'adopt', 'approve']),
  reviewStatus: z.enum(REVIEW).optional(),
  reviewNote: z.string().max(2000).optional(),
});

export const PATCH = withApiErrors(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'qc') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const doc = await prisma.sopDocument.findUnique({ where: { id } });
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.action === 'review') {
    const reviewStatus = parsed.data.reviewStatus ?? 'qc_reviewed';
    const updated = await prisma.sopDocument.update({
      where: { id },
      data: {
        reviewStatus,
        reviewNote: parsed.data.reviewNote ?? null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        approved: doc.approved && canApproveSopSource(doc.sourceRef) ? doc.approved : false,
      },
    });
    return Response.json({
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      approved: updated.approved,
      assistantStillBlocked: (await prisma.sopDocument.count({ where: { approved: true } })) === 0,
    });
  }

  if (parsed.data.action === 'adopt') {
    if (isSyntheticSopSourceRef(doc.sourceRef) || !canAdoptSopSource(doc.sourceRef)) {
      return Response.json(
        { error: 'Synthetic and already-adopted sources cannot be adopted. SYNTHETIC rows stay unapprovable.', approved: false },
        { status: 400 }
      );
    }
    const adoptedRef = `${DRINKAT_ADOPTED_PREFIX}${doc.sourceRef.replace(/^(DRAFT:FDA-FC-2026:|DRAFT:|FDA:)/i, '')}`;
    const existing = await prisma.sopDocument.findFirst({
      where: { sourceRef: adoptedRef, locale: doc.locale },
    });
    if (existing) {
      return Response.json({
        id: existing.id,
        sourceRef: existing.sourceRef,
        approved: existing.approved,
        adopted: true,
        note: 'Adoption candidate already exists. Review it, then approve with a second authorized person.',
      });
    }
    const legal = doc.locale === 'ar' ? JORDAN_SOP_LEGAL_AR : JORDAN_SOP_LEGAL_EN;
    const created = await prisma.sopDocument.create({
      data: {
        title: doc.locale === 'ar' ? `مرشح اعتماد DRINKAT — ${doc.title}` : `DRINKAT adoption candidate — ${doc.title}`,
        locale: doc.locale,
        body: [
          'STATUS: DRINKAT ADOPTION CANDIDATE — NOT APPROVED.',
          legal,
          `ADOPTED FROM: ${doc.sourceRef}`,
          '',
          doc.body,
        ].join('\n'),
        sourceRef: adoptedRef,
        qcDomain: doc.qcDomain,
        approved: false,
        reviewStatus: 'draft',
        adoptedFromId: doc.id,
        documentVersion: 1,
      },
    });
    return Response.json({
      id: created.id,
      sourceRef: created.sourceRef,
      approved: false,
      adopted: true,
      assistantStillBlocked: true,
    });
  }

  if (isSyntheticSopSourceRef(doc.sourceRef) || !canApproveSopSource(doc.sourceRef)) {
    return Response.json(
      {
        error:
          'SYNTHETIC, DRAFT, and FDA source rows cannot be approved in place. Adopt a genuine DRINKAT document, review it, then approve.',
        approved: false,
        unapprovable: isUnapprovableSopSource(doc.sourceRef),
      },
      { status: 400 }
    );
  }
  if (doc.reviewStatus !== 'qc_reviewed') {
    return Response.json({ error: 'Approve requires reviewStatus=qc_reviewed.', approved: false }, { status: 400 });
  }
  if (doc.reviewedById && doc.reviewedById === session.user.id && role !== 'owner') {
    return Response.json(
      { error: 'Two-person control: the reviewer cannot be the sole approver. Owner or a second QC must approve.', approved: false },
      { status: 400 }
    );
  }

  const updated = await prisma.sopDocument.update({
    where: { id },
    data: {
      approved: true,
      approvedById: session.user.id,
      approvedAt: new Date(),
      reviewNote: parsed.data.reviewNote ?? doc.reviewNote,
    },
  });
  return Response.json({
    id: updated.id,
    approved: true,
    sourceRef: updated.sourceRef,
    assistantStillBlocked: false,
  });
});
