// Local Node dev must use `@prisma/client` (native query engine). `@prisma/client/wasm` fails to
// initialize in Node (401 on login). Cloudflare Workers + D1 still use WASM + adapter — load wasm
// only when `env.DB` is present so the wasm bundle is never executed locally.
import { cache } from 'react';
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

function createWorkerPrismaClient(): PrismaClient {
  const { env } = getCloudflareContext();
  const d1 = env.DB;
  if (!d1) {
    throw new Error(
      'D1 binding "DB" is missing. Add d1_databases in wrangler.jsonc and attach the database to this Worker.'
    );
  }
  const { PrismaClient: PrismaWasm } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@prisma/client/wasm') as typeof import('@prisma/client');
  return new PrismaWasm({ adapter: new PrismaD1(d1) }) as PrismaClient;
}

/** Per-request D1 client on Workers (OpenNext: do not reuse a global pool across requests). */
const getWorkerPrisma = cache((): PrismaClient => createWorkerPrismaClient());

function getClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  if (url.startsWith('file:') && isNodeJsRuntime()) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClientNode();
    }
    return globalForPrisma.prisma;
  }

  if (isCloudflareWorkerRuntime()) {
    return getWorkerPrisma();
  }

  if (url.startsWith('file:')) {
    throw new Error(
      'Prisma would use bundled file DATABASE_URL on Cloudflare instead of D1. env.DB was not available from getCloudflareContext().'
    );
  }
  if (url) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClientNode();
    }
    return globalForPrisma.prisma;
  }
  throw new Error(
    'Database not configured: set DATABASE_URL to a file: URL for local dev, or deploy with D1 binding "DB".'
  );
}

/**
 * Lazy proxy so the first DB access happens inside a request (after OpenNext sets AsyncLocalStorage).
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
