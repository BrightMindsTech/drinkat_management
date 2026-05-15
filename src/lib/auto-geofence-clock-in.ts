import type { TimeClockEmployee } from '@/lib/time-clock-helpers';
import {
  getOpenClockEntry,
  resolveClockBranchForEmployee,
} from '@/lib/time-clock-helpers';
import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isAutoGeofenceClockInEnabled, isTimeClockGeofenceExempt } from '@/lib/time-clock-geofence-policy';
import { isWeeklyRatingGateBlocking, rolesSubjectToWeeklyRating } from '@/lib/weekly-ratings';

export type AutoGeofenceClockInResult =
  | { ok: true; clockedIn: true; entryId: string }
  | { ok: true; clockedIn: false; reason: 'already_clocked_in' | 'not_eligible' | 'outside_geofence' | 'weekly_rating_required' }
  | { ok: false; error: string };

/**
 * Server-side auto clock-in when GPS shows the employee inside an allowed branch.
 * Used from location-event and can be retried safely (idempotent if already clocked in).
 */
export async function attemptAutoGeofenceClockIn(
  emp: TimeClockEmployee,
  userEmail: string | null,
  userRole: string,
  lat: number,
  lng: number
): Promise<AutoGeofenceClockInResult> {
  const geofenceExempt = isTimeClockGeofenceExempt(
    { name: emp.name, role: emp.role, department: emp.department },
    userEmail
  );
  if (
    !isAutoGeofenceClockInEnabled(
      { employmentType: emp.employmentType, role: emp.role, department: emp.department },
      geofenceExempt,
      userEmail
    )
  ) {
    return { ok: true, clockedIn: false, reason: 'not_eligible' };
  }

  const role = normalizeUserRole(userRole);
  if (rolesSubjectToWeeklyRating(role)) {
    const block = await isWeeklyRatingGateBlocking(prisma, emp.id, role);
    if (block) {
      return { ok: true, clockedIn: false, reason: 'weekly_rating_required' };
    }
  }

  const existing = await getOpenClockEntry(emp.id);
  if (existing) {
    return { ok: true, clockedIn: false, reason: 'already_clocked_in' };
  }

  const branchForClock = await resolveClockBranchForEmployee({
    employmentType: emp.employmentType,
    fallbackBranchId: emp.branchId,
    lat,
    lng,
    geofenceExempt,
  });
  if (!branchForClock) {
    return { ok: true, clockedIn: false, reason: 'outside_geofence' };
  }

  try {
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
    return { ok: true, clockedIn: true, entryId: entry.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'clock-in failed';
    return { ok: false, error: msg };
  }
}
