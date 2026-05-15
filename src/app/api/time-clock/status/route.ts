import { requireSession } from '@/lib/session';
import { getTimeClockEmployee, getOpenClockEntry, getActiveAwaySession } from '@/lib/time-clock-helpers';
import { prisma } from '@/lib/prisma';
import { processExpiredAwaySessions } from '@/lib/time-clock-process';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { normalizeUserRole } from '@/lib/formVisibility';
import {
  getObligationWeekStartKey,
  isWeeklyRatingGateBlocking,
  isWeekendSubmissionEmphasis,
  rolesSubjectToWeeklyRating,
} from '@/lib/weekly-ratings';
import { isAutoGeofenceClockInEnabled, isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import { maybeRunAutoClockOutIfDue } from '@/lib/auto-clock-out-daily';

export async function GET() {
  const session = await requireSession();
  try {
    await processExpiredAwaySessions();
  } catch (e) {
    console.error('time-clock/status: failed to process expired away sessions', e);
  }
  try {
    await maybeRunAutoClockOutIfDue();
  } catch (e) {
    console.error('time-clock/status: maybe auto clock-out 4am failed', e);
  }

  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({
      applicable: false,
      reason: 'owner_or_no_employee',
    });
  }

  const open = await getOpenClockEntry(emp.id);
  const away = await getActiveAwaySession(emp.id);
  const activeBranch = open
    ? await prisma.branch.findUnique({ where: { id: open.branchId } })
    : null;
  const statusBranch = activeBranch ?? emp.branch;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { locationConsentAt: true, pushConsentAt: true },
  });

  const branchOk = statusBranch.latitude != null && statusBranch.longitude != null;
  const geofenceExempt = isTimeClockGeofenceExempt(
    { name: emp.name, role: emp.role, department: emp.department },
    session.user.email
  );
  const autoGeofenceClockIn = isAutoGeofenceClockInEnabled(
    { employmentType: emp.employmentType, role: emp.role, department: emp.department },
    geofenceExempt,
    session.user.email
  );

  const role = normalizeUserRole(session.user.role);
  let weeklyRating: {
    blocking: boolean;
    weekStartKey: string;
    emphasisWeekend: boolean;
  } | null = null;
  if (rolesSubjectToWeeklyRating(role)) {
    weeklyRating = {
      blocking: await isWeeklyRatingGateBlocking(prisma, emp.id, role),
      weekStartKey: getObligationWeekStartKey(),
      emphasisWeekend: isWeekendSubmissionEmphasis(),
    };
  }

  return Response.json({
    applicable: true,
    employeeId: emp.id,
    employeeName: emp.name,
    geofenceExempt,
    autoGeofenceClockIn,
    employmentType: emp.employmentType,
    displayTimeZone: DEFAULT_APP_TIMEZONE,
    branch: {
      id: statusBranch.id,
      name: statusBranch.name,
      hasGeofence: branchOk,
      geofenceRadiusM: statusBranch.geofenceRadiusM,
      latitude: statusBranch.latitude,
      longitude: statusBranch.longitude,
      shiftProfile: statusBranch.shiftProfile,
    },
    shift: emp.shiftDefinition,
    consent: {
      location: user?.locationConsentAt != null,
      push: user?.pushConsentAt != null,
    },
    clock: open
      ? {
          id: open.id,
          clockInAt: open.clockInAt.toISOString(),
        }
      : null,
    away: away
      ? {
          id: away.id,
          kind: away.kind,
          endsAt: away.endsAt.toISOString(),
          otherNote: away.otherNote,
        }
      : null,
    weeklyRating,
  });
}
