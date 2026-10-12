import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { normalizeUserRole } from '@/lib/permissions';
import { searchFdaIndex } from '@/lib/fda-food-code-2026';
import { searchDraftLibrary } from '@/lib/drinkat-sop-drafts';

/** QC/owner draft retrieval for review. Never feeds the live SOP assistant. */
export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'qc') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = String(url.searchParams.get('q') ?? '').trim();
  const locale = url.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  if (!q) return Response.json({ error: 'q is required' }, { status: 400 });

  const indexHits = searchFdaIndex(q).slice(0, 8);
  const libraryHits = searchDraftLibrary(q, locale).slice(0, 6);
  const stored = await prisma.sopDocument.findMany({
    where: { approved: false, locale },
    select: {
      id: true,
      title: true,
      sourceRef: true,
      locale: true,
      qcDomain: true,
      reviewStatus: true,
      approved: true,
      body: true,
    },
    take: 80,
  });
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const storedHits = stored
    .map((d) => {
      const hay = `${d.title} ${d.body} ${d.sourceRef}`.toLowerCase();
      const score = words.filter((w) => hay.includes(w)).length;
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ d }) => ({
      id: d.id,
      title: d.title,
      sourceRef: d.sourceRef,
      locale: d.locale,
      qcDomain: d.qcDomain,
      reviewStatus: d.reviewStatus,
      approved: false,
      excerpt: d.body.slice(0, 500),
    }));

  return Response.json({
    question: q,
    locale,
    mode: 'draft_review',
    approvedAnswersEnabled: false,
    note: 'Draft retrieval for QC review only. The SOP assistant remains blocked until approved DRINKAT documents exist.',
    fdaIndex: indexHits.map((c) => ({
      section: c.section,
      title: c.title,
      summary: c.summary,
      domains: c.domains,
    })),
    draftLibrary: libraryHits.map((d) => ({
      title: d.title,
      sourceRef: d.sourceRef,
      locale: d.locale,
      domain: d.domain,
      fdaSections: d.fdaSections,
      missingDrinkatInfo: d.missingDrinkatInfo,
    })),
    storedDrafts: storedHits,
  });
});
