// WASM client: OpenNext bundles the server with Node resolution; `@prisma/client` pulls index.js + native
// .so.node, which is not shipped correctly to Workers. `@prisma/client/wasm` matches Cloudflare + D1.
import { PrismaClient } from '@prisma/client/wasm';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Workers have `navigator` but no `document`; Node local dev has neither (or no document). */
function isCloudflareWorkerRuntime(): boolean {
  const g = globalThis as { navigator?: unknown; document?: unknown };
  return typeof g.navigator !== 'undefined' && typeof g.document === 'undefined';
}

function createPrismaClient(): PrismaClient {
  // On Cloudflare Workers, always prefer the D1 binding over DATABASE_URL.
  try {
    const { env } = getCloudflareContext({ async: false });
    const d1 = env.DB;
    if (d1) {
      return new PrismaClient({ adapter: new PrismaD1(d1) });
    }
    // In a Worker but D1 is not bound — do not fall back to file/SQLite (would break auth and everything else).
    throw new Error(
      'D1 binding "DB" is missing. Add d1_databases in wrangler.jsonc and attach the database to this Worker.'
    );
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('D1 binding')) {
      throw e;
    }
    // Not in a Worker request (e.g. next build, local Node without proxy)
  }

  const url = process.env.DATABASE_URL ?? '';
  // OpenNext bundles DATABASE_URL=file:./dev.db for production (see .open-next/cloudflare/next-env.mjs).
  // That path is not your D1 data on Workers — using it yields an empty DB and 401 on login.
  if (url.startsWith('file:')) {
    if (isCloudflareWorkerRuntime()) {
      throw new Error(
        'Prisma would use bundled file DATABASE_URL on Cloudflare instead of D1. env.DB was not available from getCloudflareContext({ async: false }).'
      );
    }
    return new PrismaClient();
  }
  if (url) {
    return new PrismaClient();
  }
  throw new Error(
    'Database not configured: set DATABASE_URL to a file: URL for local dev, or deploy with D1 binding "DB".'
  );
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Lazy proxy so the first DB access happens inside a request (after OpenNext sets AsyncLocalStorage).
 * Eager `new PrismaClient()` at module load can run before Cloudflare `env` / ALS exist.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...a: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
