import type { PrismaClient } from '@prisma/client';
import { AiUnavailableError } from '@/lib/ai-provider';

import { isUnapprovableSopSource } from '@/lib/drinkat-sop-drafts';

export function isSyntheticSopSource(sourceRef: string): boolean {
  return sourceRef.trim().toUpperCase().startsWith('SYNTHETIC:');
}

export { isUnapprovableSopSource };

export async function retrieveApprovedSops(
  prisma: PrismaClient,
  question: string,
  locale: 'en' | 'ar' | string
) {
  const docs = await prisma.sopDocument.findMany({
    where: { approved: true },
    select: { id: true, title: true, locale: true, body: true, sourceRef: true },
  });
  if (docs.length === 0) {
    throw new AiUnavailableError(
      'sop_unavailable',
      'Approved DRINKAT SOP documents are not loaded. SOP assistant is BLOCKED and will not use generic model knowledge.'
    );
  }
  const q = question.toLowerCase();
  const scored = docs
    .map((d) => {
      const hay = `${d.title} ${d.body}`.toLowerCase();
      const hits = q.split(/\s+/).filter((w) => w.length > 2 && hay.includes(w)).length;
      const localeBonus = d.locale === locale ? 1 : 0;
      return { d, score: hits + localeBonus };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((x) => x.score > 0)
    .map((x) => x.d);
  if (scored.length === 0) {
    return {
      passages: [] as { title: string; sourceRef: string; excerpt: string }[],
      refuse: true,
    };
  }
  return {
    passages: scored.map((d) => ({
      title: d.title,
      sourceRef: d.sourceRef,
      excerpt: d.body.slice(0, 1200),
    })),
    refuse: false,
  };
}
