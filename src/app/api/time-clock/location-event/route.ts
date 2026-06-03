import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { attemptAutoGeofenceClockIn } from '@/lib/auto-geofence-clock-in';
import { isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import { getOpenClockEntry, getTimeClockEmployee } from '@/lib/time-clock-helpers';
import { isInsideBranchRadius } from '@/lib/geo';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { getManagerUserIdForEmployee } from '@/lib/time-clock-helpers';
import { notifyGeofenceExitWhileClockedIn } from '@/lib/time-clock-notify';
import { notifyUser } from '@/lib/user-notify';

const bodySchema = z.object({
  kind: z.enum(['enter', 'exit']),
  lat: z.number(),
  lng: z.number(),
});

function originFromRequest(req: Request) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(req: Request) {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/location-event: failed to process expired away sessions', e);
  }

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Time clock does not apply' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locationConsentAt: true, pushConsentAt: true },
  });
  if (!user?.locationConsentAt) {
    return Response.json({ error: 'Location consent required' }, { status: 403 });
  }

  if (
    isTimeClockGeofenceExempt(
      {
        name: emp.name,
        role: emp.role,
        employmentType: emp.employmentType,
        department: emp.department,
      },
      session.user.email,
      session.user.role
    )
  ) {
    return Response.json({ ok: true, action: 'none' as const, inside: true });
  }

  if (emp.branch.latitude == null || emp.branch.longitude == null) {
    return Response.json({ error: 'Branch geofence not configured' }, { status: 400 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { kind, lat, lng } = parsed.data;
  const inside = isInsideBranchRadius(lat, lng, emp.branch.latitude, emp.branch.longitude, emp.branch.geofenceRadiusM);
  const open = await getOpenClockEntry(emp.id);
  const origin = originFromRequest(req);
  const deepLink = `${origin}/dashboard/time-clock`;

  let action:
    | 'none'
    | 'clocked_in_auto'
    | 'clock_in_reminder'
    | 'clock_out_reminder'
    | 'destination_required' = 'none';

  const notifySelf = async (title: string, body: string, data: Record<string, string>, category: string) => {
    if (!user?.pushConsentAt) return;
    await notifyUser(prisma, session.user.id, {
      category,
      title,
      body,
      dataJson: JSON.stringify({ ...data, href: data.url }),
      push: { title, body, data },
    });
  };

  if (kind === 'enter' && inside && !open) {
    const autoIn = await attemptAutoGeofenceClockIn(
      emp,
      session.user.email ?? null,
      session.user.role,
      lat,
      lng
    );
    if (autoIn.ok && autoIn.clockedIn) {
      action = 'clocked_in_auto';
    } else if (autoIn.ok && autoIn.reason === 'not_eligible') {
      action = 'none';
    } else {
      action = 'clock_in_reminder';
      await notifySelf(
        'Clock in',
        `You arrived at ${emp.branch.name}. Tap to clock in.`,
        { type: 'time_clock_clock_in', url: `${deepLink}?remind=clock_in` },
        'time_clock'
      );
    }
  }

  if (kind === 'exit' && !inside && open) {
    action = 'destination_required';
    await notifySelf(
      'Did you leave?',
      'Open the app and choose your reason.',
      { type: 'time_clock_destination', url: `${deepLink}?forceAway=1` },
      'time_clock'
    );

    const managerId = await getManagerUserIdForEmployee({
      reportsToEmployeeId: emp.reportsToEmployeeId,
      branchId: open.branchId,
    });
    await notifyGeofenceExitWhileClockedIn(prisma, {
      managerUserId: managerId,
      employeeId: emp.id,
      employeeName: emp.name,
      branchId: emp.branch.id,
      branchName: emp.branch.name,
    });
  }

  return Response.json({ ok: true, action, inside });
}
