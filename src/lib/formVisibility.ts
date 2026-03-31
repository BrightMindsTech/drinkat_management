/** Who can open (fill) a management form template */

export type AppUserRole = 'owner' | 'qc' | 'staff';

/** Normalize DB/session role strings so visibility checks are reliable (case, whitespace). */
export function normalizeUserRole(role: string | undefined | null): AppUserRole {
  const r = String(role ?? '')
    .trim()
    .toLowerCase();
  if (r === 'owner') return 'owner';
  if (r === 'qc') return 'qc';
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
  if (role === 'qc') return true;

  if (role !== 'staff') return false;

  if (template.departmentAssignments.length > 0) {
    return !!(ctx.employeeDepartmentId && template.departmentAssignments.some((a) => a.departmentId === ctx.employeeDepartmentId));
  }

  const dept = (ctx.employeeDepartmentName ?? '').toLowerCase();
  switch (template.category) {
    case 'qc':
      return dept.includes('qc');
    case 'marketing':
      return dept.includes('market');
    case 'kitchen':
    case 'cash':
      return true;
    default:
      return false;
  }
}

/** Who can approve/deny a submission (review) */
export function canReviewManagementSubmission(userRole: string | undefined | null, templateCategory: string): boolean {
  const role = normalizeUserRole(userRole);
  if (role === 'owner') return true;
  if (role !== 'qc') return false;
  return ['qc', 'marketing', 'kitchen', 'cash'].includes(templateCategory);
}
