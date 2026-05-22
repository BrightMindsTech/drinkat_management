/* eslint-disable no-restricted-globals */
/**
 * Service worker copy of src/lib/push-navigation.ts — keep in sync when adding push types.
 */

function normalizeInAppPath(url) {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('/')) return raw;
  try {
    const u = new URL(raw);
    return `${u.pathname}${u.search}${u.hash}` || '/dashboard';
  } catch {
    return null;
  }
}

const PUSH_TYPE_ROUTES = {
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
  advance_request_pending_review: () => '/dashboard/hr#hr-owner-advances',
  leave_request_pending_review: () => '/dashboard/hr#hr-owner-leave',
  support_report: () => '/dashboard/support',
  chat_message: (d) =>
    d.threadId ? `/dashboard/messages?thread=${encodeURIComponent(d.threadId)}` : '/dashboard/messages',
  time_clock_clock_in: () => '/dashboard/time-clock?remind=clock_in',
  time_clock_destination: () => '/dashboard/time-clock?forceAway=1',
  time_clock_destination_required: () => '/dashboard/time-clock',
  clock_in_reminder: () => '/dashboard/time-clock',
  clock_out_shifts_remind: () => '/dashboard/time-clock',
  time_clock_away_expired: () => '/dashboard/time-clock',
  time_clock_away_started: () => '/dashboard/time-clock',
  weekly_rating_reminder: () => '/dashboard/ratings',
  push_test: () => '/dashboard/messages',
  push_connected: () => '/dashboard',
};

function resolvePushNavigationUrl(data) {
  const type = (data.type || '').trim();
  if (type === 'owner_broadcast') {
    return normalizeInAppPath(data.url);
  }
  const explicit = normalizeInAppPath(data.url);
  if (explicit) return explicit;
  if (!type) return null;
  const build = PUSH_TYPE_ROUTES[type];
  return build ? build(data) : null;
}

function enrichPushData(data) {
  const out = { ...(data || {}) };
  if (out.type === 'owner_broadcast') {
    const path = normalizeInAppPath(out.url);
    if (path) out.url = path;
    return out;
  }
  if (!normalizeInAppPath(out.url)) {
    const resolved = resolvePushNavigationUrl(out);
    if (resolved) out.url = resolved;
  } else {
    const path = normalizeInAppPath(out.url);
    if (path) out.url = path;
  }
  return out;
}
