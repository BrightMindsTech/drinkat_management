import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import { getTimeClockEmployee, getOpenClockEntry, resolveClockBranchForEmployee } from '@/lib/time-clock-helpers';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isWeeklyRatingGateBlocking, rolesSubjectToWeeklyRating } from '@/lib/weekly-ratings';

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/clock-in: failed to process expired away sessions', e);
  }

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Time clock does not apply' }, { status: 403 });
  }

  const role = normalizeUserRole(session.user.role);
  if (rolesSubjectToWeeklyRating(role)) {
    const block = await isWeeklyRatingGateBlocking(prisma, emp.id, role);
    if (block) {
      return Response.json(
        {
          error: 'Complete required weekly ratings before clocking in.',
          code: 'weekly_rating_required',
          ratingsPath: '/dashboard/ratings',
        },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locationConsentAt: true },
  });
  if (!user?.locationConsentAt) {
    return Response.json({ error: 'Location consent required' }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { lat, lng } = parsed.data;
  const geofenceExempt = isTimeClockGeofenceExempt(
    { name: emp.name, department: emp.department },
    session.user.email
  );
  const branchForClock = await resolveClockBranchForEmployee({
    employmentType: emp.employmentType,
    fallbackBranchId: emp.branchId,
    lat,
    lng,
    geofenceExempt,
  });
  if (!branchForClock) {
    return Response.json({ error: 'You must be within branch radius to clock in' }, { status: 400 });
  }

  const existing = await getOpenClockEntry(emp.id);
  if (existing) {
    // Idempotent success: if another request just clocked-in, avoid surfacing a client error.
    return Response.json({
      ok: true,
      alreadyClockedIn: true,
      entry: { id: existing.id, clockInAt: existing.clockInAt.toISOString() },
    });
  }

  const entry = await prisma.timeClockEntry.create({
    data: {
      id: crypto.randomUUID(),
      employeeId: emp.id,
      branchId: branchForClock.id,
      clockInAt: new Date(),
      clockInLat: lat,
      clockInLng: lng,
    },
  });

  return Response.json({
    ok: true,
    entry: { id: entry.id, clockInAt: entry.clockInAt.toISOString() },
  });
}
