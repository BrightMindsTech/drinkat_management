import { prisma } from '@/lib/prisma';

export type DbHealthResult = { ok: boolean; error?: string };

/** Lightweight probe used by /api/health/ready and production cron. */
export async function checkDatabaseHealth(): Promise<DbHealthResult> {
  try {
    await prisma.user.count();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
