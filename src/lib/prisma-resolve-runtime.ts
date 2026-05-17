/**
 * Pure Prisma runtime selection (unit-tested).
 *
 * Production on Cloudflare MUST resolve to `d1` when the Worker has env.DB.
 * Never use navigator/document heuristics here — nodejs_compat can polyfill `document`
 * and caused a full-site outage when D1 was skipped with an empty DATABASE_URL.
 */
export type PrismaRuntimeKind = 'node-file' | 'd1' | 'node-url' | 'misconfigured';

export function resolvePrismaRuntime(opts: {
  databaseUrl: string;
  isNodeJs: boolean;
  hasD1Binding: boolean;
}): PrismaRuntimeKind {
  const url = opts.databaseUrl ?? '';

  if (url.startsWith('file:') && opts.isNodeJs) {
    return 'node-file';
  }

  if (opts.hasD1Binding) {
    return 'd1';
  }

  if (url.startsWith('file:')) {
    return 'misconfigured';
  }

  if (url) {
    return 'node-url';
  }

  return 'misconfigured';
}

export function prismaRuntimeError(kind: PrismaRuntimeKind): string {
  switch (kind) {
    case 'misconfigured':
      return (
        'Database not configured: set DATABASE_URL to a file: URL for local Node dev, ' +
        'or deploy with D1 binding "DB" (wrangler d1_databases).'
      );
    default:
      return `Unexpected Prisma runtime: ${kind}`;
  }
}
