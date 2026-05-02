import { isZainBadarneh } from '@/lib/named-employee-policy';

/**
 * Employees who clock in/out without branch geofence checks (remote / QC / named allowlist).
 */
export function isTimeClockGeofenceExempt(
  emp: { name: string; department: { name: string } | null },
  userEmail?: string | null
): boolean {
  if (isZainBadarneh(emp, userEmail)) return true;
  const d = emp.department?.name?.trim().toLowerCase() ?? '';
  if (d === 'qc' || d === 'quality control') return true;
  return false;
}
