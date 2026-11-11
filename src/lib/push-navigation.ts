/**
 * Deep links for push notification taps.
 * Owner broadcast (`owner_broadcast`) is excluded from defaults — only uses explicit `url` from the owner.
 */

export type PushNavData = Record<string, string | undefined>;

type RouteBuilder = (data: PushNavData) => string | null;

const PUSH_TYPE_ROUTES: Record<string, RouteBuilder> = {
  management_form_submitted: (d) =>
    d.submissionId
      ? `/dashboard/forms#forms-review-submission-${d.submissionId}`
      : '/dashboard/forms#section-forms-review',
  forms_submission_branch_manager: (d) =>
    d.submissionId
      ? `/dashboard/forms#forms-review-submission-${d.submissionId}`
      : '/dashboard/forms#section-forms-review',
  forms_cash_submitted_to_owner: () => '/dashboard/forms#section-forms-review',
  forms_submission_owner_direct: () => '/dashboard/forms#section-forms-review',
  forms_submission_owner_fallback: () => '/dashboard/forms#section-forms-review',
  qc_submission_pending_review: (d) =>
    d.submissionId
      ? `/dashboard/qc#qc-review-submission-${d.submissionId}`
      : '/dashboard/qc#qc-review-submissions',
  qc_assignment_created: (d) =>
    d.assignmentId ? `/dashboard/qc#qc-assignment-${d.assignmentId}` : '/dashboard/qc',
  qc_assignment_removed: () => '/dashboard/qc',
  staff_qc_submit: (d) =>
    d.assignmentId ? `/dashboard/qc#qc-assignment-${d.assignmentId}` : '/dashboard/qc',
  advance_request_pending_review: () => '/dashboard/hr#hr-owner-advances',
  advance_decided: () => '/dashboard/hr',
  leave_request_pending_review: () => '/dashboard/hr#hr-owner-leave',
  leave_request_decided: () => '/dashboard/hr',
  qc_submission_reviewed: () => '/dashboard/qc',
  support_report: () => '/dashboard/support',
  chat_message: (d) =>
    d.threadId ? `/dashboard/messages?thread=${encodeURIComponent(d.threadId)}` : '/dashboard/messages',
  weekly_rating_reminder: () => '/dashboard/ratings',
  push_test: () => '/dashboard/messages',
  push_connected: () => '/dashboard',
  daily_app_reminder: () => '/dashboard',
  inspection_submitted: () => '/dashboard/issues',
  inspection_due: (d) => (d.taskId ? `/dashboard/tasks/${encodeURIComponent(d.taskId)}` : '/dashboard/tasks'),
  inspection_overdue: (d) =>
    d.taskId ? `/dashboard/tasks/${encodeURIComponent(d.taskId)}` : '/dashboard/tasks',
  issue_escalation: (d) => (d.issueId ? `/dashboard/issues/${d.issueId}` : '/dashboard/issues'),
  photo_check_due: (d) =>
    d.taskId ? `/dashboard/photo?task=${encodeURIComponent(d.taskId)}` : '/dashboard/photo',
  photo_check_overdue: (d) =>
    d.taskId ? `/dashboard/photo?task=${encodeURIComponent(d.taskId)}` : '/dashboard/photo',
  photo_check_review: (d) =>
    d.submissionId
      ? `/dashboard/photo-review?submission=${encodeURIComponent(d.submissionId)}`
      : '/dashboard/photo-review',
  staff_note: () => '/dashboard',
  qc_field_report: (d) =>
    d.reportId ? `/dashboard/qc-reports?report=${encodeURIComponent(d.reportId)}` : '/dashboard/qc-reports',
};

/** Normalize absolute or relative URLs to an in-app path. */
export function normalizeInAppPath(url: string | undefined | null): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}${u.hash}` || '/dashboard';
  } catch {
    return null;
  }
}

export function safeInternalPath(raw: string | null | undefined): string {
  const n = normalizeInAppPath(raw);
  if (!n || n.startsWith('//') || n === '/login') return '/dashboard';
  if (!n.startsWith('/dashboard')) return '/dashboard';
  return n;
}

function isSpecificPath(path: string): boolean {
  return /[?#]/.test(path) || /^\/dashboard\/(?:issues|tasks)\/[^/?#]+/.test(path);
}

/**
 * Resolve where to navigate when a push is opened.
 * Typed entity IDs win over a generic list `url` in the payload.
 * `owner_broadcast` only honors an explicit `url` (no type-based default).
 */
export function resolvePushNavigationUrl(data: PushNavData): string | null {
  const type = data.type?.trim();
  if (type === 'owner_broadcast') {
    return normalizeInAppPath(data.url);
  }

  const fromType = type && PUSH_TYPE_ROUTES[type] ? PUSH_TYPE_ROUTES[type](data) : null;
  const explicit = normalizeInAppPath(data.url);
  if (fromType && isSpecificPath(fromType)) return fromType;
  if (explicit && isSpecificPath(explicit)) return explicit;
  return fromType || explicit || null;
}

/** Ensure every outbound push payload includes a relative in-app `url` when possible. */
export function enrichPushData(data?: Record<string, string>): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = { ...data };
  if (out.type === 'owner_broadcast') {
    const path = normalizeInAppPath(out.url);
    if (path) out.url = path;
    return out;
  }
  const resolved = resolvePushNavigationUrl(out);
  if (resolved) out.url = resolved;
  return out;
}
