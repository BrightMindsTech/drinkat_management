import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/formVisibility';
import { getOwnerLiveAttendanceRows } from '@/lib/time-clock-owner-live';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (normalizeUserRole(session.user.role) !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const rows = await getOwnerLiveAttendanceRows(prisma);
  return Response.json({ rows });
}
