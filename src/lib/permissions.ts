/**
 * Centralized permission management (Phase 1, DRINKAT QC).
 *
 * Single source of truth for:
 *  - the set of login roles (including the new, distinct `assistant_manager`),
 *  - role-string normalization,
 *  - the role -> capability matrix,
 *  - branch-level data scope per role.
 *
 * Rules encoded here (approved Phase 1 directives):
 *  - Assistant Manager is a DISTINCT role. It does NOT inherit Branch Manager
 *    permissions. Its Phase 1 baseline is explicitly staff-equivalent; any
 *    broader access must be granted here, capability by capability, in later
 *    phases.
 *  - Unknown / legacy role strings normalize to `staff` (lowest privilege),
 *    matching the app's historical behavior.
 */

export const APP_USER_ROLES = [
  'owner',
  'qc',
  'manager',
  'assistant_manager',
  'staff',
  'marketing',
] as const;

export type AppUserRole = (typeof APP_USER_ROLES)[number];

/** Normalize DB/session role strings so permission checks are reliable (case, whitespace, aliases). */
export function normalizeUserRole(role: string | undefined | null): AppUserRole {
  const r = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (r === 'owner') return 'owner';
  if (r === 'qc') return 'qc';
  if (r === 'manager') return 'manager';
  if (r === 'assistant_manager' || r === 'assistantmanager' || r === 'asst_manager') {
    return 'assistant_manager';
  }
  if (r === 'marketing') return 'marketing';
  return 'staff';
}

/**
 * Named capabilities. Each corresponds to a gate that exists in the app today.
 * Add new capabilities here (with matrix entries) instead of writing
 * `role === '...'` checks in routes or components.
 */
export type Capability =
  /** Full HR admin area (frozen HR data; read/export). Owner only after Phase 1. */
  | 'hr:admin'
  /** Create employees / staff logins org-wide. */
  | 'employees:manage'
  /** Manage own team (direct reports) — Branch Manager scope. */
  | 'employees:manageTeam'
  /** Review QC checklist submissions (approve/deny/rate). */
  | 'qc:review'
  /** Create QC checklists and assign them. */
  | 'qc:assign'
  /** Submit assigned QC checklists. */
  | 'qc:submit'
  /** Fill management form templates (visibility rules still apply per template). */
  | 'forms:fill'
  /** Create/edit/version form templates. */
  | 'forms:manageTemplates'
  /** Assign cash-form templates to individual employees. */
  | 'forms:assignCash'
  /** Submit weekly ratings for others (owner org-wide, manager for team). */
  | 'ratings:manage'
  /** Is a subject of weekly ratings (gets rated). */
  | 'ratings:subject'
  /** Review manager daily reports. */
  | 'managerReports:review'
  /** Participate in chat (API kept; navigation removed in Phase 1). */
  | 'chat:use'
  /** View org-wide reports dashboards. */
  | 'reports:view'
  /** Run assigned guided inspections. */
  | 'inspections:run'
  /** View branch inspection tasks. */
  | 'inspections:viewBranch'
  /** Update issues for own branch / assignment (not verify). */
  | 'issues:update'
  /** View own KPI. */
  | 'kpi:viewOwn'
  /** View branch KPI (operational indicators). */
  | 'kpi:viewBranch'
  /** Owner-assigned HR review of calculated KPI. Not payroll. */
  | 'kpi:hrReview'
  /** Use AI suggestion endpoints (human confirm). */
  | 'ai:use';

const ALL_CAPABILITIES: Record<Capability, true> = {
  'hr:admin': true,
  'employees:manage': true,
  'employees:manageTeam': true,
  'qc:review': true,
  'qc:assign': true,
  'qc:submit': true,
  'forms:fill': true,
  'forms:manageTemplates': true,
  'forms:assignCash': true,
  'ratings:manage': true,
  'ratings:subject': true,
  'managerReports:review': true,
  'chat:use': true,
  'reports:view': true,
  'inspections:run': true,
  'inspections:viewBranch': true,
  'issues:update': true,
  'kpi:viewOwn': true,
  'kpi:viewBranch': true,
  'kpi:hrReview': true,
  'ai:use': true,
};

export const CAPABILITIES: Capability[] = Object.keys(ALL_CAPABILITIES) as Capability[];

/**
 * Role -> capability matrix. Explicit per role — no inheritance between roles.
 * `assistant_manager` intentionally mirrors `staff` in Phase 1 (plus nothing):
 * see module docblock.
 */
const ROLE_CAPABILITIES: Record<AppUserRole, ReadonlySet<Capability>> = {
  owner: new Set<Capability>([
    'hr:admin',
    'employees:manage',
    'qc:review',
    'qc:assign',
    'forms:manageTemplates',
    'ratings:manage',
    'managerReports:review',
    'reports:view',
    'inspections:viewBranch',
    'issues:update',
    'kpi:viewBranch',
    'kpi:hrReview',
    'ai:use',
  ]),
  qc: new Set<Capability>([
    'employees:manage',
    'qc:review',
    'qc:assign',
    'qc:submit',
    'forms:fill',
    'ratings:subject',
    'reports:view',
    'inspections:run',
    'inspections:viewBranch',
    'issues:update',
    'kpi:viewBranch',
    'ai:use',
  ]),
  manager: new Set<Capability>([
    // NOTE: no 'qc:submit' — managers review QC; they have never been able to
    // submit checklists themselves (matches the pre-Phase-1 gate exactly).
    'employees:manageTeam',
    'qc:review',
    'forms:fill',
    'forms:assignCash',
    'ratings:manage',
    'ratings:subject',
    'inspections:run',
    'inspections:viewBranch',
    'issues:update',
    'kpi:viewBranch',
    'ai:use',
  ]),
  assistant_manager: new Set<Capability>([
    'qc:submit',
    'forms:fill',
    'ratings:subject',
    'inspections:run',
    'issues:update',
    'kpi:viewOwn',
    'ai:use',
  ]),
  staff: new Set<Capability>([
    'qc:submit',
    'forms:fill',
    'ratings:subject',
    'inspections:run',
    'kpi:viewOwn',
    'ai:use',
  ]),
  marketing: new Set<Capability>(['forms:fill', 'ratings:subject']),
};

export function hasCapability(role: string | undefined | null, capability: Capability): boolean {
  return ROLE_CAPABILITIES[normalizeUserRole(role)].has(capability);
}

/** Roles that get rated weekly (replaces scattered lists). */
export function rolesSubjectToWeeklyRating(role: string | undefined | null): boolean {
  return hasCapability(role, 'ratings:subject');
}

/**
 * Branch-level data scope for a role:
 *  - organization: may read data across all branches
 *  - branch: limited to own branch / direct reports
 *  - self: limited to own records
 */
export type DataScope = 'organization' | 'branch' | 'self';

export function dataScopeForRole(role: string | undefined | null): DataScope {
  const r = normalizeUserRole(role);
  if (r === 'owner' || r === 'qc') return 'organization';
  if (r === 'manager') return 'branch';
  // assistant_manager intentionally `self` in Phase 1; branch scope arrives
  // with the Phase 2 features that need it (and duty-roster attribution).
  return 'self';
}

/** Staff-level roles: the Phase 1 baseline group for submit/fill flows. */
export function isStaffLevelRole(role: string | undefined | null): boolean {
  const r = normalizeUserRole(role);
  return r === 'staff' || r === 'assistant_manager';
}

/* ------------------------------------------------------------------------- *
 * API route policy registry
 *
 * Documents the access policy of every API route. A unit test enumerates
 * `src/app/api` route files and fails if any route is missing here, so new
 * routes must declare their policy to ship.
 * ------------------------------------------------------------------------- */

export type RouteAccess =
  | 'public' // no session required (login, health, cron with secret, push service hooks)
  | 'session' // any signed-in user; handler applies per-role logic via this module
  | 'owner'
  | 'ownerOrManager'
  | 'manager'
  | 'qcReview' // owner | qc | manager | computed QC reviewer scope
  | 'cronSecret'; // requires the cron shared secret header

/**
 * One entry per API route.ts file (path relative to src/app/api, without the
 * trailing route.ts). Value = the loosest gate any method in the file allows;
 * per-method tightening (e.g. GET session / POST owner) lives in the handler
 * and is noted where it exists.
 */
export const API_ROUTE_POLICIES: Record<string, RouteAccess> = {
  'advances': 'session', // GET self/team/all per role; POST staff-level
  'advances/[id]': 'ownerOrManager',
  'assignments': 'qcReview',
  'assignments/[id]': 'qcReview',
  'auth/[...nextauth]': 'public',
  'branches/[id]': 'owner',
  'chat/threads': 'session',
  'chat/threads/[id]/messages': 'session',
  'chat/threads/[id]/read': 'session',
  'chat/threads/[id]/typing': 'session',
  'chat/unread': 'session',
  'chat/users': 'session',
  'checklists': 'qcReview',
  'checklists/[id]': 'qcReview',
  'checklists/[id]/items': 'qcReview',
  'checklists/[id]/items/[itemId]': 'qcReview',
  'client-error': 'public', // anonymous client error beacon
  'cron/chat-cleanup': 'cronSecret',
  'cron/time-clock': 'cronSecret',
  'departments': 'owner', // owner or flagged HR staff admin
  'departments/[id]': 'owner',
  'employees': 'session', // GET scoped per role; POST owner/HR staff admin
  'employees/[id]': 'owner', // owner or flagged HR staff admin
  'employees/[id]/documents': 'session', // self or owner/HR inside handler
  'employees/[id]/documents/[docId]': 'owner',
  'employees/[id]/reset-password': 'owner',
  'employees/[id]/reviews': 'session', // owner/HR/manager logic inside handler
  'employees/[id]/salary-history': 'session', // self or owner inside handler
  'employees/[id]/transfer': 'owner',
  'employees/advance-limit': 'owner',
  'forms/submissions': 'session', // visibility scoped per role inside handler
  'forms/submissions/[id]': 'session',
  'forms/submissions/[id]/mark-reviewed': 'session',
  'forms/submissions/[id]/report-to-owner': 'session',
  'forms/templates': 'session', // GET catalog; POST owner inside handler
  'forms/templates/[id]': 'session', // PATCH owner/manager-assign inside handler
  'forms/templates/[id]/export': 'session', // owner/manager inside handler
  'forms/templates/import-barista': 'owner',
  'forms/templates/import-defaults': 'owner',
  'forms/templates/import-google-paste': 'owner',
  'health-db': 'owner',
  'hr/export': 'owner',
  'health/ready': 'public',
  'leave': 'session', // GET scoped per role; POST staff-level
  'leave/[id]': 'ownerOrManager',
  'manager-reports/[id]/detail': 'session', // owner or authoring manager inside handler
  'manager-reports/[id]/review': 'owner',
  'push/broadcast': 'owner',
  'push/cleanup': 'owner',
  'push/client-diagnostic': 'session',
  'push/consent-status': 'session',
  'push/debug': 'owner',
  'push/device-status': 'session',
  'push/opt-in': 'session',
  'push/register': 'session',
  'push/test': 'session',
  'push/vapid-public': 'session',
  'qc/submissions': 'session', // staff/qc submit; listing scoped inside handler
  'qc/submissions/[id]': 'qcReview',
  'ratings/weekly': 'session', // owner/manager manage, subjects read own
  'reports': 'owner',
  'review-notifications': 'session',
  'salary': 'owner',
  'salary/deductions': 'owner',
  'salary/upload': 'owner',
  'support/reports': 'session', // POST any user; GET owner inside handler
  'support/reports/[id]': 'owner',
  'upload': 'session',
  'upload/discard': 'session',
  'uploads/[[...segments]]': 'session',
  'sop/documents': 'session',
  'sop/documents/[id]': 'session',
  'sop/search': 'session',
  'forms/templates/[id]/versions': 'session',
  'inspections/tasks': 'session',
  'inspections/tasks/[id]': 'session',
  'inspections/tasks/[id]/start': 'session',
  'inspections/tasks/[id]/draft': 'session',
  'inspections/tasks/[id]/submit': 'session',
  'issues': 'session',
  'issues/[id]': 'session',
  'escalation-rules': 'owner',
  'kpi/me': 'session',
  'kpi/branch': 'session',
  'kpi/weights': 'owner',
  'kpi/hr-reviews': 'session',
  'kpi/hr-reviewers': 'owner',
  'ai/run': 'session',
  'ai/status': 'session',
  'ai/transcribe': 'session',
  'qc/overview': 'session',
  'photo-checks': 'session',
  'photo-checks/queue': 'qcReview',
  'photo-checks/[id]/review': 'qcReview',
  'photo-checks/archive': 'session',
  'photo-checks/tasks': 'session',
  'photo-ops/employees': 'session',
  'photo-ops/types': 'session',
  'photo-ops/references': 'qcReview',
  'photo-ops/admins': 'owner',
  'photo-ops/schedules': 'session',
  'qc-reports': 'session',
  notes: 'session',
  'hr-notes': 'session',
};
