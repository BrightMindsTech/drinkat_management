// Local Node dev must use `@prisma/client` (native query engine). `@prisma/client/wasm` fails to
// initialize in Node (401 on login). Cloudflare Workers + D1 still use WASM + adapter — load wasm
// only when `env.DB` is present so the wasm bundle is never executed locally.
import { PrismaClient as PrismaClientNode } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Workers have `navigator` but no `document`; Node local dev has neither (or no document). */
function isCloudflareWorkerRuntime(): boolean {
  const g = globalThis as { navigator?: unknown; document?: unknown };
  return typeof g.navigator !== 'undefined' && typeof g.document === 'undefined';
}

/** OpenNext dev may polyfill `navigator` — use Node’s version string to pick the native Prisma engine. */
function isNodeJsRuntime(): boolean {
  return typeof process !== 'undefined' && typeof process.versions?.node === 'string';
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  // Local `next dev` uses SQLite `file:` — native engine only. Do not use `!isCloudflareWorkerRuntime()`
  // here: OpenNext can polyfill `navigator` and wrongly look like a Worker while still running Node.
  if (url.startsWith('file:') && isNodeJsRuntime()) {
    return new PrismaClientNode();
  }

  // Deployed Worker: D1 + WASM (bundled `file:` DATABASE_URL is not real D1 data — ignore it).
  try {
    const { env } = getCloudflareContext({ async: false });
    const d1 = env.DB;
    if (d1 && isCloudflareWorkerRuntime()) {
      const { PrismaClient: PrismaWasm } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@prisma/client/wasm') as typeof import('@prisma/client');
      return new PrismaWasm({ adapter: new PrismaD1(d1) }) as PrismaClient;
    }
    if (!d1 && isCloudflareWorkerRuntime()) {
      throw new Error(
        'D1 binding "DB" is missing. Add d1_databases in wrangler.jsonc and attach the database to this Worker.'
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('D1 binding')) {
      throw e;
    }
  }

  if (url.startsWith('file:')) {
    throw new Error(
      'Prisma would use bundled file DATABASE_URL on Cloudflare instead of D1. env.DB was not available from getCloudflareContext({ async: false }).'
    );
  }
  if (url) {
    return new PrismaClientNode();
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
