/** Who can open (fill) a management form template */

import { isZainBadarneh } from '@/lib/named-employee-policy';

export type AppUserRole = 'owner' | 'qc' | 'staff' | 'manager' | 'marketing';

/** Normalize DB/session role strings so visibility checks are reliable (case, whitespace). */
export function normalizeUserRole(role: string | undefined | null): AppUserRole {
  const r = String(role ?? '')
    .trim()
    .toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'qc') return 'qc';
  if (r === 'manager') return 'manager';
  if (r === 'marketing') return 'marketing';
  return 'staff';
}

export type FormViewContext = {
  userRole: AppUserRole;
  employeeDepartmentId: string | null;
  employeeDepartmentName: string | null;
};

export type TemplateForVisibility = {
  category: string;
  departmentAssignments: { departmentId: string }[];
};

export type TemplateWithEmployeeAssignments = TemplateForVisibility & {
  employeeAssignments: { employeeId: string }[];
};

export type EmployeeForFormAccess = {
  id: string;
  role: string;
  name: string;
};

export function isQcFormCategory(category: string): boolean {
  return category === 'qc';
}

export function isCashFormCategory(category: string): boolean {
  return category === 'cash';
}

/** QC visit forms: account login role `qc` or employee profile role `qc` only. */
export function isQcFormEmployee(
  userRole: AppUserRole,
  employee: { role: string } | null | undefined
): boolean {
  if (userRole === 'qc') return true;
  return (employee?.role ?? '').trim().toLowerCase() === 'qc';
}

export function canFillManagementForm(ctx: FormViewContext, template: TemplateForVisibility): boolean {
  const role = normalizeUserRole(ctx.userRole);
  if (role === 'owner') return false;

  if (isQcFormCategory(template.category) || isCashFormCategory(template.category)) {
    return false;
  }

  if (template.departmentAssignments.length > 0) {
    return !!(
      ctx.employeeDepartmentId &&
      template.departmentAssignments.some((a) => a.departmentId === ctx.employeeDepartmentId)
    );
  }

  return false;
}

function isExplicitlyAssigned(
  employeeId: string | null | undefined,
  template: TemplateWithEmployeeAssignments
): boolean {
  return !!(employeeId && template.employeeAssignments.some((a) => a.employeeId === employeeId));
}

/**
 * Whether this user may fill (submit) a management form template.
 * - QC: QC employees only (role), plus department/explicit assignment within QC.
 * - Cash: managers always; other staff only when a manager assigned them individually.
 * - Other categories: department and/or explicit employee assignment.
 */
export function canUserFillTemplate(
  ctx: FormViewContext,
  template: TemplateWithEmployeeAssignments,
  employee: EmployeeForFormAccess | null,
  userEmail?: string | null
): boolean {
  const role = normalizeUserRole(ctx.userRole);
  if (role === 'owner') return false;

  const employeeId = employee?.id ?? null;
  const explicit = isExplicitlyAssigned(employeeId, template);

  if (isQcFormCategory(template.category)) {
    if (!isQcFormEmployee(role, employee)) return false;
    if (explicit) return true;
    if (template.departmentAssignments.length > 0) {
      return !!(
        ctx.employeeDepartmentId &&
        template.departmentAssignments.some((a) => a.departmentId === ctx.employeeDepartmentId)
      );
    }
    return false;
  }

  if (isCashFormCategory(template.category)) {
    if (employee && isZainBadarneh({ name: employee.name }, userEmail)) return false;
    if (role === 'manager') return true;
    return explicit;
  }

  if (explicit) return true;
  return canFillManagementForm(ctx, template);
}

/** Owner edit / department assignment list — all templates. */
export function canOwnerManageTemplate(_category: string): boolean {
  return true;
}

/** Manager employee-assignment panel — cash forms only (not QC). */
export function canManagerAssignTemplate(category: string): boolean {
  return isCashFormCategory(category);
}

/** Templates shown in fill lists (non-owner). */
export function isTemplateVisibleInFillCatalog(
  ctx: FormViewContext,
  template: TemplateWithEmployeeAssignments & { active: boolean },
  employee: EmployeeForFormAccess | null,
  userEmail?: string | null
): boolean {
  if (!template.active) return false;
  return canUserFillTemplate(ctx, template, employee, userEmail);
}

/** Legacy: management forms no longer use approve/deny; kept for any old call sites. */
export function canReviewManagementSubmission(_userRole: string | undefined | null, _templateCategory: string): boolean {
  return false;
}
