import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';
import { isZainBadarneh } from '@/lib/named-employee-policy';

export type GeofencePolicyEmployee = {
  name: string;
  role: string;
  employmentType?: string | null;
  department: { name: string } | null;
};

/**
 * Geofence / clock-in rules (unchanged by status-route fix):
 *
 * | Group | Manual clock-in | Auto geofence clock-in |
 * |-------|-----------------|-------------------------|
 * | Marketing (role) | Anywhere → home branch on record | Off |
 * | Zain Badarneh | Anywhere → home branch | Off |
 * | QC department | Anywhere → home branch | Off |
 * | Part-time | Nearest branch with configured geofence | Off |
 * | Full-time staff/manager | Assigned branch geofence only | On (if consented) |
 */
export function isPartTimeEmployment(employmentType: string | null | undefined): boolean {
  return String(employmentType ?? 'full_time').trim().toLowerCase() === 'part_time';
}

function isMarketingRole(employeeRole: string, accountRole?: AppUserRole | null): boolean {
  if (employeeRole.trim().toLowerCase() === 'marketing') return true;
  return accountRole === 'marketing';
}

/**
 * Employees who clock in/out without branch radius checks
 * (marketing anywhere, remote QC by department, Zain Badarneh allowlist).
 */
export function isTimeClockGeofenceExempt(
  emp: GeofencePolicyEmployee,
  userEmail?: string | null,
  /** Login role from session — covers marketing even if employee profile role differs. */
  accountRoleInput?: string | null
): boolean {
  const accountRole = accountRoleInput ? normalizeUserRole(accountRoleInput) : null;

  if (isMarketingRole(emp.role, accountRole)) return true;
  if (isZainBadarneh({ name: emp.name }, userEmail)) return true;

  const d = emp.department?.name?.trim().toLowerCase() ?? '';
  if (d === 'qc' || d === 'quality control') return true;

  return false;
}

/**
 * Auto clock-in when entering branch geofence (background GPS watch).
 * Part-time and geofence-exempt staff always use manual clock-in rules instead.
 */
export function isAutoGeofenceClockInEnabled(
  emp: Pick<GeofencePolicyEmployee, 'employmentType' | 'role' | 'department'>,
  /** Must be from {@link isTimeClockGeofenceExempt} with full name + email (+ account role). */
  geofenceExempt: boolean
): boolean {
  if (geofenceExempt) return false;
  if (isPartTimeEmployment(emp.employmentType)) return false;
  return true;
}

/** Single entry point so every route computes exempt the same way. */
export function resolveGeofencePolicy(
  emp: GeofencePolicyEmployee,
  userEmail?: string | null,
  accountRoleInput?: string | null
): { geofenceExempt: boolean; autoGeofenceClockIn: boolean } {
  const geofenceExempt = isTimeClockGeofenceExempt(emp, userEmail, accountRoleInput);
  const autoGeofenceClockIn = isAutoGeofenceClockInEnabled(emp, geofenceExempt);
  return { geofenceExempt, autoGeofenceClockIn };
}
