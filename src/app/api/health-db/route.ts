import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Quick check that the Worker can reach D1 (user table count). Does not expose rows.
 * GET /api/health-db — expect { ok: true, userCount: number } when DB works.
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ ok: true, userCount });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
