import { prisma } from '@/lib/prisma';
import { withPrismaRetry } from '@/lib/prisma-retry';

export type DbHealthResult = { ok: boolean; error?: string };

/** Lightweight probe used by /api/health/ready and production cron. */
export async function checkDatabaseHealth(): Promise<DbHealthResult> {
  try {
    await withPrismaRetry(() => prisma.user.count(), 5, 120);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
