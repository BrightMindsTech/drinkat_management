import { hasCapability } from '@/lib/permissions';

export function canSeeIssue(
  role: string,
  employee: { id: string; branchId: string } | null,
  issue: { branchId: string | null; assigneeEmployeeId: string | null }
): boolean {
  if (role === 'owner' || role === 'qc') return true;
  if (!employee) return false;
  if (role === 'manager') return issue.branchId === employee.branchId;
  if (role === 'assistant_manager') {
    return issue.branchId === employee.branchId && hasCapability(role, 'issues:update');
  }
  return false;
}
