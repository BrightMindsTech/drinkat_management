import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { getActiveAwaySession, getOpenClockEntry, getTimeClockEmployee } from '@/lib/time-clock-helpers';
import { isInsideBranchRadius } from '@/lib/geo';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { prisma } from '@/lib/prisma';

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/presence-check: failed to process expired away sessions', e);
  }

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) return Response.json({ triggerAway: false, reason: 'not_applicable' });

  const open = await getOpenClockEntry(emp.id);
  if (!open) return Response.json({ triggerAway: false, reason: 'not_clocked_in' });

  const away = await getActiveAwaySession(emp.id);
  if (away) return Response.json({ triggerAway: false, reason: 'away_already_active' });

  const entryBranch = await prisma.branch.findUnique({ where: { id: open.branchId } });
  if (!entryBranch || entryBranch.latitude == null || entryBranch.longitude == null) {
    return Response.json({ triggerAway: false, reason: 'branch_geofence_not_configured' });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { lat, lng } = parsed.data;
  const inside = isInsideBranchRadius(lat, lng, entryBranch.latitude, entryBranch.longitude, entryBranch.geofenceRadiusM);
  if (inside) return Response.json({ triggerAway: false, reason: 'inside_radius' });

  return Response.json({ triggerAway: true, reason: 'outside_radius_clocked_in' });
}
