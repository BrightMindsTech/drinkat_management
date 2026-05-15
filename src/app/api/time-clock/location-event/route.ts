import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { attemptAutoGeofenceClockIn } from '@/lib/auto-geofence-clock-in';
import { isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import { getOpenClockEntry, getTimeClockEmployee } from '@/lib/time-clock-helpers';
import { isInsideBranchRadius } from '@/lib/geo';
import { sendPushToUser } from '@/lib/push';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { createInboxForUsers, getOwnerUserIds } from '@/lib/time-clock-helpers';

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

  if (isTimeClockGeofenceExempt({ name: emp.name, role: emp.role, department: emp.department }, session.user.email)) {
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
  const subs = await prisma.pushSubscription.findMany({ where: { userId: session.user.id } });
  const origin = originFromRequest(req);
  const deepLink = `${origin}/dashboard/time-clock`;

  let action:
    | 'none'
    | 'clocked_in_auto'
    | 'clock_in_reminder'
    | 'clock_out_reminder'
    | 'destination_required' = 'none';

  const pushSelf = async (title: string, body: string, data: Record<string, string>) => {
    await sendPushToUser(session.user.id, subs, { title, body, data });
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
      await pushSelf('Clock in', `You arrived at ${emp.branch.name}. Tap to clock in.`, {
        type: 'time_clock_clock_in',
        url: `${deepLink}?remind=clock_in`,
      });
    }
  }

  if (kind === 'exit' && !inside && open) {
    action = 'destination_required';
    await pushSelf('Did you leave?', 'Open the app and choose your reason.', {
      type: 'time_clock_destination',
      url: `${deepLink}?forceAway=1`,
    });

    // Owner receives this alert immediately; no manager escalation required.
    const ownerIds = await getOwnerUserIds();
    if (ownerIds.length > 0) {
      await createInboxForUsers(ownerIds, {
        category: 'time_clock',
        title: 'Time clock alert: employee left branch',
        body: `${emp.name} exited ${emp.branch.name} while still clocked in.`,
        dataJson: JSON.stringify({
          type: 'time_clock_destination_required',
          employeeId: emp.id,
          employeeName: emp.name,
          branchId: emp.branch.id,
          branchName: emp.branch.name,
          href: '/dashboard/time-clock',
        }),
      });
      const ownerSubs = await prisma.pushSubscription.findMany({ where: { userId: { in: ownerIds } } });
      for (const ownerId of ownerIds) {
        const subsForOwner = ownerSubs.filter((s) => s.userId === ownerId);
        await sendPushToUser(ownerId, subsForOwner, {
          title: 'Time clock alert: employee left branch',
          body: `${emp.name} exited ${emp.branch.name} while still clocked in.`,
          data: {
            type: 'time_clock_destination_required',
            url: '/dashboard/time-clock',
            employeeId: emp.id,
          },
        });
      }
    }
  }

  return Response.json({ ok: true, action, inside });
}
