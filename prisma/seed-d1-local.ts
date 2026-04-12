/**
 * Seeds local Miniflare D1 (same persistence as `wrangler d1 execute --local` / `npm run preview`).
 * Run after: npm run db:d1:migrate:local
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { seedDatabase } from './seed-shared';

async function main() {
  const { env, dispose } = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    remoteBindings: false,
  });
  const d1 = env.DB;
  if (!d1) {
    throw new Error('Missing D1 binding "DB" in wrangler.jsonc');
  }
  const prisma = new PrismaClient({ adapter: new PrismaD1(d1) });
  try {
    await seedDatabase(prisma);
    console.log('Local D1 seed finished.');
  } finally {
    await prisma.$disconnect();
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
