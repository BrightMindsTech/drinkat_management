import { isZainBadarneh } from '@/lib/named-employee-policy';

/**
 * Employees who clock in/out without branch geofence checks
 * (marketing anywhere, remote QC by department, named allowlist).
 */
export function isTimeClockGeofenceExempt(
  emp: { name: string; role: string; department: { name: string } | null },
  userEmail?: string | null
): boolean {
  if (emp.role === 'marketing') return true;
  if (isZainBadarneh(emp, userEmail)) return true;
  const d = emp.department?.name?.trim().toLowerCase() ?? '';
  if (d === 'qc' || d === 'quality control') return true;
  return false;
}

/**
 * Auto clock-in when entering branch geofence (background GPS watch).
 * Part-time staff clock in manually at whichever branch they are at.
 */
export function isAutoGeofenceClockInEnabled(
  emp: { employmentType: string; role: string; department: { name: string } | null },
  geofenceExempt: boolean,
  userEmail?: string | null
): boolean {
  if (geofenceExempt || isTimeClockGeofenceExempt(emp, userEmail)) return false;
  if (emp.employmentType === 'part_time') return false;
  return true;
}
