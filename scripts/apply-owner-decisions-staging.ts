/**
 * Applies Owner 2026-10-12 decisions to STAGING only.
 * Does not enable extra employees. Does not write production.
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { readFileSync } from 'node:fs';
import { DRINKAT_OPS_MANUAL_DOCS } from '../src/lib/drinkat-ops-manual';
import { PHOTO_KPI_WEIGHTS_APPROVED_KEY } from '../src/lib/kpi-engine';
import { HANDWRITTEN_ESPRESSO_NOTE, PHOTO_360_OFFICIAL_WINDOWS } from '../src/lib/photo-official-windows';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const STAGING_D1_ID = '9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c';

async function main() {
  const raw = readFileSync(new URL('../wrangler.seed-d1-staging.jsonc', import.meta.url), 'utf8');
  if (raw.includes(PRODUCTION_D1_ID) || !raw.includes(STAGING_D1_ID)) {
    throw new Error('REFUSED: not isolated staging D1');
  }
  const { env, dispose } = await getPlatformProxy({
    configPath: 'wrangler.seed-d1-staging.jsonc',
    remoteBindings: true,
  });
  const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB as never) });
  try {
    const owner = await prisma.user.findUnique({ where: { email: 'stg-owner@qc-staging.local' } });
    if (!owner) throw new Error('stg-owner missing');
    const now = new Date();

    let manuals = 0;
    for (const doc of DRINKAT_OPS_MANUAL_DOCS) {
      const existing = await prisma.sopDocument.findFirst({
        where: { sourceRef: doc.sourceRef, locale: doc.locale },
      });
      const data = {
        title: doc.title,
        body: doc.body,
        qcDomain: doc.qcDomain,
        approved: true,
        reviewStatus: 'qc_reviewed',
        reviewedById: owner.id,
        reviewedAt: now,
        approvedById: owner.id,
        approvedAt: now,
        reviewNote: 'Owner 2026-10-12: approve all DRINKAT-MANUAL rows. Handwritten espresso 18 g / 36 g overrides working-manual 16 g / 50 g. Mango machine = slush machine.',
      };
      if (existing) {
        await prisma.sopDocument.update({ where: { id: existing.id }, data });
      } else {
        await prisma.sopDocument.create({
          data: { ...data, locale: doc.locale, sourceRef: doc.sourceRef },
        });
      }
      manuals += 1;
    }

    const fdaApproved = await prisma.sopDocument.count({
      where: {
        approved: true,
        OR: [{ sourceRef: { startsWith: 'DRAFT:' } }, { sourceRef: { startsWith: 'FDA:' } }, { sourceRef: { startsWith: 'SYNTHETIC:' } }],
      },
    });
    if (fdaApproved !== 0) throw new Error('REFUSED: FDA/DRAFT/SYNTHETIC rows must stay unapproved');

    await prisma.qcAppConfig.upsert({
      where: { key: PHOTO_KPI_WEIGHTS_APPROVED_KEY },
      update: { value: '1' },
      create: { key: PHOTO_KPI_WEIGHTS_APPROVED_KEY, value: '1' },
    });

    const type360 = await prisma.photoCheckType.findUnique({ where: { code: 'branch_cleanliness_360' } });
    if (!type360) throw new Error('360 catalog missing');
    await prisma.photoCheckType.update({
      where: { id: type360.id },
      data: { active: true, provisional: false },
    });
    await prisma.photoCheckType.updateMany({
      where: { code: { in: ['portafilter_coffee_dose', 'espresso_shot_weight', 'coffee_machine_calibration'] } },
      data: { handwrittenNote: HANDWRITTEN_ESPRESSO_NOTE },
    });
    await prisma.photoCheckType.updateMany({
      where: { code: 'slush_machine_cleaning' },
      data: { titleEn: 'Slush Machine Cleaning', titleAr: 'تنظيف ماكينة السلاش', provisional: false },
    });

    for (const slot of PHOTO_360_OFFICIAL_WINDOWS) {
      const existing = await prisma.photoCheckSchedule.findFirst({
        where: { typeId: type360.id, slotKey: slot.slotKey },
        orderBy: { createdAt: 'asc' },
      });
      const data = {
        ...slot,
        typeId: type360.id,
        employeeId: null,
        branchId: null,
        role: null,
        daysOfWeekJson: '[0,1,2,3,4,5,6]',
        active: true,
        reminderMinutesBefore: 30,
        overdueReminderMinutes: 15,
        maxReminders: 3,
        reminderCooldownMinutes: 180,
      };
      if (existing) {
        await prisma.photoCheckSchedule.update({ where: { id: existing.id }, data });
      } else {
        await prisma.photoCheckSchedule.create({ data });
      }
    }

    const extras = await prisma.photoCheckSchedule.findMany({
      where: { typeId: type360.id, employeeId: { not: null } },
    });
    for (const extra of extras) {
      await prisma.photoCheckSchedule.update({
        where: { id: extra.id },
        data: { active: false, employeeId: extra.employeeId },
      });
    }

    const approvedManual = await prisma.sopDocument.count({
      where: { approved: true, sourceRef: { startsWith: 'DRINKAT-MANUAL:' } },
    });
    const photoOn = await prisma.photoCheckEmployeeSetting.count({ where: { required: true } });
    console.log(
      JSON.stringify({
        manualsUpserted: manuals,
        approvedManual,
        kpiPhotoWeights: '1',
        official360Windows: PHOTO_360_OFFICIAL_WINDOWS.map((s) => `${s.slotKey} ${s.startTime}-${s.dueTime} Asia/Amman`),
        employeesPhotoOn: photoOn,
        note: 'No extra employees enabled. Reference photos still required from Owner.',
      })
    );
  } finally {
    await prisma.$disconnect();
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
