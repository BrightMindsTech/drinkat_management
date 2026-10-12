/**
 * Upserts Owner-provided DRINKAT operations manual into staging D1 only.
 * Never sets approved=1. Does not change photo scoring criteria.
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { readFileSync } from 'node:fs';
import { DRINKAT_OPS_MANUAL_DOCS } from '../src/lib/drinkat-ops-manual';

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
    for (const doc of DRINKAT_OPS_MANUAL_DOCS) {
      const existing = await prisma.sopDocument.findFirst({
        where: { sourceRef: doc.sourceRef, locale: doc.locale },
      });
      const data = {
        title: doc.title,
        body: doc.body,
        qcDomain: doc.qcDomain,
        approved: existing?.approved ?? false,
        reviewStatus:
          existing && (existing.reviewStatus === 'qc_reviewed' || existing.approved)
            ? existing.reviewStatus
            : ('draft' as const),
      };
      if (existing) {
        await prisma.sopDocument.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.sopDocument.create({
          data: {
            ...data,
            locale: doc.locale,
            sourceRef: doc.sourceRef,
          },
        });
      }
      upserts += 1;
    }

    const doseNote =
      'Owner-approved handwritten specification: dose 18 g / yield 36 g. Working-manual 16 g / 50 g is superseded.';
    await prisma.photoCheckType.updateMany({
      where: { code: { in: ['portafilter_coffee_dose', 'espresso_shot_weight', 'coffee_machine_calibration'] } },
      data: { handwrittenNote: doseNote },
    });

    const approvedManual = await prisma.sopDocument.count({
      where: { approved: true, sourceRef: { startsWith: 'DRINKAT-MANUAL:' } },
    });
    const draftManual = await prisma.sopDocument.count({
      where: { sourceRef: { startsWith: 'DRINKAT-MANUAL:' } },
    });
    console.log(
      `ingest-drinkat-manual-staging: ${upserts} rows upserted; manualRows=${draftManual}; approvedManual=${approvedManual} (ingest never flips approved=1 by itself)`
    );
    await prisma.$disconnect();
  } finally {
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
