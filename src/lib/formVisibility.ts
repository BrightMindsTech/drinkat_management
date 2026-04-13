/** Who can open (fill) a management form template */

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

export function canFillManagementForm(ctx: FormViewContext, template: TemplateForVisibility): boolean {
  const role = normalizeUserRole(ctx.userRole);
  if (role === 'owner') return false;

  // Form visibility is assignment-based (department and/or explicit employee assignment in callers).
  if (template.departmentAssignments.length > 0) {
    return !!(ctx.employeeDepartmentId && template.departmentAssignments.some((a) => a.departmentId === ctx.employeeDepartmentId));
  }

  // No assignment means not visible to fill (unless explicitly employee-assigned in calling code).
  return false;
}

/** Legacy: management forms no longer use approve/deny; kept for any old call sites. */
export function canReviewManagementSubmission(_userRole: string | undefined | null, _templateCategory: string): boolean {
  return false;
}
