import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-health';

export const dynamic = 'force-dynamic';

/**
 * Public readiness probe: verifies Prisma can reach D1 (or local DB).
 * Used by post-deploy smoke test — no auth, returns only { ok, db }.
 */
export async function GET() {
  const health = await checkDatabaseHealth();
  if (health.ok) {
    return NextResponse.json({ ok: true, db: true });
  }
  console.error('[health/ready] database check failed', health.error);
  return NextResponse.json({ ok: false, db: false }, { status: 503 });
}
