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
