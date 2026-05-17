import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Public readiness probe: verifies Prisma can reach D1 (or local DB).
 * Used by post-deploy smoke test — no auth, returns only { ok, db }.
 */
export async function GET() {
  try {
    await prisma.user.count();
    return NextResponse.json({ ok: true, db: true });
  } catch (e) {
    console.error('[health/ready] database check failed', e);
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
