import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';

/**
 * Branch-level data access. Assistant Manager is `self` in Phase 1 and does
 * not inherit Branch Manager's branch scope.
 */
export function canAccessBranchData(opts: {
  role: string | undefined | null;
  actorBranchId: string | null | undefined;
  resourceBranchId: string | null | undefined;
}): boolean {
  const scope = dataScopeForRole(opts.role);
  if (scope === 'organization') return true;
  if (!opts.resourceBranchId) return false;
  if (scope === 'branch') {
    return !!opts.actorBranchId && opts.actorBranchId === opts.resourceBranchId;
  }
  // self: branch match is not enough — caller must also restrict to own employee id.
  return !!opts.actorBranchId && opts.actorBranchId === opts.resourceBranchId;
}

export function canAccessEmployeeRecord(opts: {
  role: string | undefined | null;
  actorEmployeeId: string | null | undefined;
  actorBranchId: string | null | undefined;
  resourceEmployeeId: string;
  resourceBranchId: string;
  resourceReportsToEmployeeId?: string | null;
}): boolean {
  const role = normalizeUserRole(opts.role);
  const scope = dataScopeForRole(role);
  if (scope === 'organization') return true;
  if (scope === 'branch') {
    if (opts.actorEmployeeId && opts.resourceReportsToEmployeeId === opts.actorEmployeeId) {
      return true;
    }
    return !!opts.actorBranchId && opts.actorBranchId === opts.resourceBranchId;
  }
  return !!opts.actorEmployeeId && opts.actorEmployeeId === opts.resourceEmployeeId;
}
