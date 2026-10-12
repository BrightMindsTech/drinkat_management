/**
 * Staging photo seed. Official 360 windows are Asia/Amman (Owner-confirmed 2026-10-12).
 * Does not enable production employees.
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { readFileSync } from 'node:fs';
import { PHOTO_360_OFFICIAL_WINDOWS } from '../src/lib/photo-official-windows';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const STAGING_D1_ID = '9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c';

async function main() {
  const raw = readFileSync(new URL('../wrangler.seed-d1-staging.jsonc', import.meta.url), 'utf8');
  if (raw.includes(PRODUCTION_D1_ID) || !raw.includes(STAGING_D1_ID)) {
    throw new Error('REFUSED: photo staging seed is not pointed at isolated staging D1');
  }
  const { env, dispose } = await getPlatformProxy({
    configPath: 'wrangler.seed-d1-staging.jsonc',
    remoteBindings: true,
  });
  const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });
  try {
    const type = await prisma.photoCheckType.findUnique({ where: { code: 'branch_cleanliness_360' } });
    if (!type) throw new Error('Catalog missing. Run 0023 on staging first.');
    await prisma.photoCheckType.update({
      where: { id: type.id },
      data: { active: true, provisional: false },
    });

    const staffUser = await prisma.user.findUnique({
      where: { email: 'stg-staff-a@qc-staging.local' },
      include: { employee: true },
    });
    if (!staffUser?.employee) throw new Error('stg-staff-a missing');

    await prisma.photoCheckEmployeeSetting.upsert({
      where: { employeeId: staffUser.employee.id },
      update: { required: true },
      create: { employeeId: staffUser.employee.id, required: true, updatedById: staffUser.id },
    });
    await prisma.photoCheckEmployeeType.upsert({
      where: { employeeId_typeId: { employeeId: staffUser.employee.id, typeId: type.id } },
      update: { assigned: true },
      create: { employeeId: staffUser.employee.id, typeId: type.id, assigned: true },
    });

    const hr = await prisma.user.findUnique({ where: { email: 'stg-staff-b@qc-staging.local' } });
    if (hr) {
      await prisma.user.update({
        where: { id: hr.id },
        data: { photoOpsAdmin: true, qcReportsInbox: true },
      });
    }

    for (const slot of PHOTO_360_OFFICIAL_WINDOWS) {
      const existing = await prisma.photoCheckSchedule.findFirst({
        where: { typeId: type.id, slotKey: slot.slotKey, employeeId: null },
      });
      const data = {
        ...slot,
        typeId: type.id,
        employeeId: null,
        branchId: null,
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
    console.log('photo staging seed: 360 official Asia/Amman slots for whoever is ON; stg-staff-b flagged as photo ops / reports inbox');
  } finally {
    await prisma.$disconnect();
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
