import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

/**
 * Owner-only D1 connectivity check (user count only, no row data).
 */
export async function GET() {
  try {
    await requireOwner();
    const userCount = await prisma.user.count();
    return NextResponse.json({ ok: true, userCount });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
