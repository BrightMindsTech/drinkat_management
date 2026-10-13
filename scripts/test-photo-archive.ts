import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';
import {
  PHOTO_ARCHIVE_PURGED_PATH,
  PHOTO_ARCHIVE_RETENTION_DAYS,
  isPurgedPhotoPath,
  photoArchiveCutoff,
  purgeExpiredPhotoArchive,
  userCanViewPhotoArchive,
} from '../src/lib/photo-archive';
import { submissionUploadPaths } from '../src/lib/photo-multi';

function sessionOf(role: string, id = 'u1'): Session {
  return { user: { id, role }, expires: '2099-01-01' } as Session;
}

function prismaUser(row: { hrKpiReviewer?: boolean; employee?: { role: string; department: { name: string } | null } | null }) {
  return {
    user: {
      findUnique: async () => ({
        hrKpiReviewer: Boolean(row.hrKpiReviewer),
        employee: row.employee ?? null,
      }),
    },
  } as unknown as PrismaClient;
}

assert.equal(PHOTO_ARCHIVE_RETENTION_DAYS, 30);
const now = new Date('2026-10-13T10:00:00.000Z');
const cutoff = photoArchiveCutoff(now);
assert.equal(cutoff.getTime(), now.getTime() - 30 * 24 * 60 * 60 * 1000);
assert.equal(isPurgedPhotoPath('purged'), true);
assert.equal(isPurgedPhotoPath(PHOTO_ARCHIVE_PURGED_PATH), true);
assert.equal(isPurgedPhotoPath(''), true);
assert.equal(isPurgedPhotoPath('/api/uploads/a.jpg'), false);

assert.deepEqual(
  submissionUploadPaths({
    uploadPath: 'purged',
    images: [
      { uploadPath: 'purged', sortOrder: 0 },
      { uploadPath: '/api/uploads/keep.jpg', sortOrder: 1 },
    ],
  }),
  ['/api/uploads/keep.jpg']
);
assert.deepEqual(submissionUploadPaths({ uploadPath: 'purged', images: [] }), []);
assert.deepEqual(submissionUploadPaths({ uploadPath: '/api/uploads/a.jpg', images: [] }), ['/api/uploads/a.jpg']);

async function assertArchiveAccess() {
  assert.equal(await userCanViewPhotoArchive(prismaUser({}), sessionOf('owner')), true);
  assert.equal(await userCanViewPhotoArchive(prismaUser({}), sessionOf('qc')), true);
  assert.equal(
    await userCanViewPhotoArchive(
      prismaUser({ hrKpiReviewer: true, employee: { role: 'staff', department: null } }),
      sessionOf('staff')
    ),
    true
  );
  assert.equal(
    await userCanViewPhotoArchive(
      prismaUser({ employee: { role: 'qc', department: { name: 'QC' } } }),
      sessionOf('staff')
    ),
    true
  );
  assert.equal(await userCanViewPhotoArchive(prismaUser({}), sessionOf('manager')), false);
  assert.equal(
    await userCanViewPhotoArchive(
      prismaUser({ employee: { role: 'staff', department: null } }),
      sessionOf('staff')
    ),
    false
  );
  assert.equal(await userCanViewPhotoArchive(prismaUser({}), null), false);
}

const updates: Array<{ id: string; uploadPath: string }> = [];
let watermark: Date | null = null;
const stalePrisma = {
  appCronWatermark: {
    findUnique: async () => (watermark ? { lastRunAt: watermark } : null),
    upsert: async ({ create, update }: { create: { lastRunAt: Date }; update: { lastRunAt: Date } }) => {
      watermark = update.lastRunAt ?? create.lastRunAt;
      return { key: 'photo_archive_retention', lastRunAt: watermark };
    },
  },
  photoCheckSubmission: {
    findMany: async () => [
      {
        id: 's1',
        uploadPath: '/api/uploads/old.jpg',
        images: [{ id: 'i1', uploadPath: '/api/uploads/old.jpg' }],
      },
    ],
    update: async ({ where, data }: { where: { id: string }; data: { uploadPath: string } }) => {
      updates.push({ id: where.id, uploadPath: data.uploadPath });
      return { id: where.id };
    },
  },
  photoCheckSubmissionImage: {
    deleteMany: async () => ({ count: 1 }),
  },
  uploadObject: {
    delete: async () => ({ objectKey: 'old.jpg' }),
  },
} as unknown as PrismaClient;

async function assertPurgeStale() {
  const first = await purgeExpiredPhotoArchive(stalePrisma, now);
  assert.equal(first.purged, 1);
  assert.equal(updates[0]?.uploadPath, 'purged');
  const second = await purgeExpiredPhotoArchive(stalePrisma, new Date(now.getTime() + 60_000));
  assert.equal(second.purged, 0);
  assert.equal(second.skipped, 0);
}

const emptyPrisma = {
  appCronWatermark: {
    findUnique: async () => null,
    upsert: async () => ({ key: 'photo_archive_retention', lastRunAt: now }),
  },
  photoCheckSubmission: {
    findMany: async () => [],
    update: async () => ({ id: 'none' }),
  },
  photoCheckSubmissionImage: { deleteMany: async () => ({ count: 0 }) },
  uploadObject: { delete: async () => ({}) },
} as unknown as PrismaClient;
async function assertPurgeEmpty() {
  const empty = await purgeExpiredPhotoArchive(emptyPrisma, now);
  assert.equal(empty.purged, 0);
  assert.equal(empty.skipped, 1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
assert(fs.existsSync(path.join(root, 'src/app/dashboard/photo-archive/page.tsx')));
assert(fs.existsSync(path.join(root, 'src/components/photo-check/PhotoArchivePanel.tsx')));
assert.match(fs.readFileSync(path.join(root, 'src/lib/permissions.ts'), 'utf8'), /photo-checks\/archive/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-nav-config.ts'), 'utf8'), /photo-archive/);
const managerNavBlock = (fs.readFileSync(path.join(root, 'src/lib/dashboard-nav-config.ts'), 'utf8').split("if (r === 'manager')")[1] ?? '').split("if (r === 'marketing')")[0];
assert.doesNotMatch(managerNavBlock, /photo-archive/);

void (async () => {
  await assertArchiveAccess();
  await assertPurgeStale();
  await assertPurgeEmpty();
  console.log('photo-archive: ok');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
