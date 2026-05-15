import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getTimeClockEmployee, getOpenClockEntry, getActiveAwaySession } from '@/lib/time-clock-helpers';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { normalizeUserRole } from '@/lib/formVisibility';
import {
  getObligationWeekStartKey,
  isWeeklyRatingGateBlocking,
  isWeekendSubmissionEmphasis,
  rolesSubjectToWeeklyRating,
} from '@/lib/weekly-ratings';
import { resolveGeofencePolicy } from '@/lib/time-clock-geofence-policy';

/** Build time-clock status JSON for an authenticated session (shared by route + diagnostics). */
export async function buildTimeClockStatusPayload(session: Session) {
  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return {
      applicable: false as const,
      reason: 'owner_or_no_employee',
    };
  }

  const open = await getOpenClockEntry(emp.id);
  const away = await getActiveAwaySession(emp.id);
  const activeBranch = open ? await prisma.branch.findUnique({ where: { id: open.branchId } }) : null;
  const statusBranch = activeBranch ?? emp.branch;

  let locationConsent = false;
  let pushConsent = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locationConsentAt: true, pushConsentAt: true },
    });
    locationConsent = user?.locationConsentAt != null;
    pushConsent = user?.pushConsentAt != null;
  } catch (e) {
    console.error('[time-clock/status] consent columns read failed', e);
  }

  const branchOk = statusBranch.latitude != null && statusBranch.longitude != null;
  const employmentType = emp.employmentType ?? 'full_time';
  const { geofenceExempt, autoGeofenceClockIn } = resolveGeofencePolicy(
    {
      name: emp.name,
      role: emp.role,
      employmentType,
      department: emp.department,
    },
    session.user.email,
    session.user.role
  );

  const role = normalizeUserRole(session.user.role);
  let weeklyRating: {
    blocking: boolean;
    weekStartKey: string;
    emphasisWeekend: boolean;
  } | null = null;
  if (rolesSubjectToWeeklyRating(role)) {
    const weekStartKey = getObligationWeekStartKey();
    const emphasisWeekend = isWeekendSubmissionEmphasis();
    try {
      weeklyRating = {
        blocking: await isWeeklyRatingGateBlocking(prisma, emp.id, role),
        weekStartKey,
        emphasisWeekend,
      };
    } catch (e) {
      console.error('[time-clock/status] weekly rating gate check failed', e);
      weeklyRating = { blocking: false, weekStartKey, emphasisWeekend };
    }
  }

  const shiftProfile =
    statusBranch && typeof statusBranch === 'object' && 'shiftProfile' in statusBranch
      ? String((statusBranch as { shiftProfile?: string }).shiftProfile ?? 'default')
      : 'default';

  return {
    applicable: true as const,
    employeeId: emp.id,
    employeeName: emp.name,
    geofenceExempt,
    autoGeofenceClockIn,
    employmentType,
    displayTimeZone: DEFAULT_APP_TIMEZONE,
    branch: {
      id: statusBranch.id,
      name: statusBranch.name,
      hasGeofence: branchOk,
      geofenceRadiusM: statusBranch.geofenceRadiusM ?? 25,
      latitude: statusBranch.latitude,
      longitude: statusBranch.longitude,
      shiftProfile,
    },
    shift: emp.shiftDefinition,
    consent: {
      location: locationConsent,
      push: pushConsent,
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
  };
}
