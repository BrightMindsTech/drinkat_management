/**
 * Quality KPI eligibility for one photo submission.
 * Rejected stays in the denominator with a zero contribution.
 * Approved UNASSESSABLE is excluded even if a score leaked.
 * Pending / unavailable never enter quality or approval.
 */
export function photoSubmissionCountsInQuality(sub: {
  status: string;
  aiVerdict?: string | null;
  aiScore?: number | null;
} | null | undefined): boolean {
  if (!sub) return false;
  if (sub.status === 'rejected') return true;
  if (sub.status !== 'approved') return false;
  if (String(sub.aiVerdict ?? '').toLowerCase() === 'unassessable') return false;
  return sub.aiScore != null;
}

export function photoQualityContribution(sub: {
  status: string;
  aiVerdict?: string | null;
  aiScore?: number | null;
} | null | undefined): number {
  if (!photoSubmissionCountsInQuality(sub)) return 0;
  if (sub?.status === 'rejected') return 0;
  return sub?.aiScore ?? 0;
}
