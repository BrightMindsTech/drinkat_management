import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import {
  getTimeClockEmployee,
  getOpenClockEntry,
  getOwnerUserIds,
} from '@/lib/time-clock-helpers';
import { isInsideBranchRadius, isNearRecordedFix } from '@/lib/geo';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { DEFAULT_APP_TIMEZONE, localCalendarDayBoundsUtc } from '@/lib/shifts';
import { isWeeklyRatingGateBlocking, rolesSubjectToWeeklyRating } from '@/lib/weekly-ratings';
import { isZainBadarneh } from '@/lib/named-employee-policy';

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/clock-out: failed to process expired away sessions', e);
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
          error: 'Complete required weekly ratings before clocking out.',
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
  const open = await getOpenClockEntry(emp.id);
  if (!open) {
    // Idempotent success: if user was auto clocked out moments ago, don't surface an error.
    return Response.json({ ok: true, alreadyClockedOut: true });
  }

  const geofenceExempt = isTimeClockGeofenceExempt(
    { name: emp.name, role: emp.role, department: emp.department },
    session.user.email
  );

  if (!geofenceExempt) {
    const entryBranch = await prisma.branch.findUnique({ where: { id: open.branchId } });
    if (!entryBranch || entryBranch.latitude == null || entryBranch.longitude == null) {
      return Response.json({ error: 'Branch location not configured' }, { status: 400 });
    }

    // Looser radius + optional match to clock-in fix: GPS often drifts between two requests even when stationary.
    const insideBranch = isInsideBranchRadius(
      lat,
      lng,
      entryBranch.latitude,
      entryBranch.longitude,
      entryBranch.geofenceRadiusM,
      1.45
    );
    const nearClockIn = isNearRecordedFix(lat, lng, open.clockInLat, open.clockInLng, 120);
    if (!insideBranch && !nearClockIn) {
      return Response.json({ error: 'You must be within branch radius to clock out' }, { status: 400 });
    }
  }

  if (role === 'manager' && !isZainBadarneh(emp, session.user.email)) {
    const applicableCashTemplates = await prisma.managementFormTemplate.findMany({
      where: {
        active: true,
        category: 'cash',
        OR: [
          { employeeAssignments: { some: { employeeId: emp.id } } },
          ...(emp.departmentId
            ? [{ departmentAssignments: { some: { departmentId: emp.departmentId } } }]
            : []),
        ],
      },
      select: { id: true },
    });
    if (applicableCashTemplates.length > 0) {
      const templateIds = applicableCashTemplates.map((t) => t.id);
      const { dayStartUtc, nextDayStartUtc } = localCalendarDayBoundsUtc(new Date(), DEFAULT_APP_TIMEZONE);
      const cashSubmission = await prisma.managementFormSubmission.findFirst({
        where: {
          employeeId: emp.id,
          templateId: { in: templateIds },
          submittedAt: { gte: dayStartUtc, lt: nextDayStartUtc },
        },
        select: { id: true },
        orderBy: { submittedAt: 'desc' },
      });
      if (!cashSubmission) {
        return Response.json(
          {
            error: "Submit today's cash form to the owner before clocking out.",
            code: 'cash_form_required',
            formsPath: '/dashboard/forms#section-forms-available',
          },
          { status: 400 }
        );
      }
      const ownerIds = await getOwnerUserIds();
      if (ownerIds.length > 0) {
        const needle = `"submissionId":"${cashSubmission.id}"`;
        const ownerInbox = await prisma.inboxNotification.findFirst({
          where: {
            userId: { in: ownerIds },
            dataJson: { contains: needle },
            category: {
              in: ['forms_cash_submitted_to_owner', 'forms_submission_owner_fallback'],
            },
          },
          select: { id: true },
        });
        if (!ownerInbox) {
          return Response.json(
            {
              error: "Submit today's cash form to the owner before clocking out.",
              code: 'cash_form_required',
              formsPath: '/dashboard/forms#section-forms-available',
            },
            { status: 400 }
          );
        }
      }
    }
  }

  const now = new Date();
  const updated = await prisma.timeClockEntry.update({
    where: { id: open.id },
    data: {
      clockOutAt: now,
      clockOutLat: lat,
      clockOutLng: lng,
      clockOutReason: 'manual',
    },
  });

  return Response.json({
    ok: true,
    entry: { id: updated.id, clockOutAt: updated.clockOutAt!.toISOString() },
  });
}
