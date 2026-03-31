/**
 * Seeds production Cloudflare D1 (remote). Uses wrangler.seed-d1.jsonc (`remote: true`) so this
 * matches `wrangler d1 execute --remote`, not an empty local Miniflare DB. Run: npm run db:seed:remote
 */
import { getPlatformProxy } from 'wrangler';
import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { seedDatabase } from './seed-shared';

async function main() {
  const { env, dispose } = await getPlatformProxy({
    // Minimal config with `remote: true` so Prisma hits the same DB as `wrangler d1 execute --remote` (not empty local Miniflare).
    configPath: 'wrangler.seed-d1.jsonc',
    remoteBindings: true,
  });
  const d1 = env.DB;
  if (!d1) {
    throw new Error('Missing D1 binding "DB" in wrangler.jsonc');
  }
  const prisma = new PrismaClient({ adapter: new PrismaD1(d1) });
  try {
    await seedDatabase(prisma);
    console.log('Remote D1 seed finished.');
  } finally {
    await prisma.$disconnect();
    await dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
