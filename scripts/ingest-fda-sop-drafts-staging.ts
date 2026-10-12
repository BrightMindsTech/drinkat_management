/**
 * Upserts FDA Food Code 2026 DRAFT SOPs into staging D1 only.
 * Never sets approved=1.
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { readFileSync } from 'node:fs';
import { DRINKAT_SOP_DRAFTS } from '../src/lib/drinkat-sop-drafts';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const STAGING_D1_ID = '9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c';

function assertStaging() {
  const raw = readFileSync(new URL('../wrangler.seed-d1-staging.jsonc', import.meta.url), 'utf8');
  if (raw.includes(PRODUCTION_D1_ID) || raw.includes('drinkat-management')) {
    throw new Error('REFUSED: ingest config points at production');
  }
  if (!raw.includes(STAGING_D1_ID)) {
    throw new Error('REFUSED: ingest is staging-only');
  }
}

async function main() {
  assertStaging();
  const { env, dispose } = await getPlatformProxy({
    configPath: 'wrangler.seed-d1-staging.jsonc',
    remoteBindings: true,
  });
  try {
    const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB as never) });
    let upserts = 0;
    for (const draft of DRINKAT_SOP_DRAFTS) {
      const existing = await prisma.sopDocument.findFirst({
        where: { sourceRef: draft.sourceRef, locale: draft.locale },
      });
      if (existing) {
        await prisma.sopDocument.update({
          where: { id: existing.id },
          data: {
            title: draft.title,
            body: draft.body,
            qcDomain: draft.domain,
            approved: false,
            reviewStatus: existing.reviewStatus || 'draft',
          },
        });
      } else {
        await prisma.sopDocument.create({
          data: {
            title: draft.title,
            locale: draft.locale,
            body: draft.body,
            sourceRef: draft.sourceRef,
            qcDomain: draft.domain,
            approved: false,
            reviewStatus: 'draft',
          },
        });
      }
      upserts += 1;
    }
    const approved = await prisma.sopDocument.count({ where: { approved: true } });
    const drafts = await prisma.sopDocument.count({ where: { approved: false } });
    console.log(`ingest-fda-sop-drafts-staging: ${upserts} drafts upserted; approved=${approved}; unapproved=${drafts}`);
    if (approved !== 0) throw new Error('REFUSED: ingest must not leave approved SOP rows');
    await prisma.$disconnect();
  } finally {
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
