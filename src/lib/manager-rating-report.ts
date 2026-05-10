/** Owner-visible manager accountability metrics for the reports page. */

import type { AppUserRole } from '@/lib/formVisibility';

export type ManagerRatingRow = {
  managerId: string;
  managerName: string;
  branchId: string;
  branchName: string;
  teamSize: number;
  /** Structured performance reviews the manager logged for direct reports in range */
  perfReviewsConducted: number;
  perfReviewAvgStars: number | null;
  perfReviewsScore: number;
  /** Management forms filed by direct reports in range */
  teamFormSubmissions: number;
  teamFormsHandled: number;
  teamFormsCoverageScore: number;
  /** Forms the manager submitted as assignee */
  managerOwnForms: number;
  managerOwnFormsScore: number;
  /** Manager's time-clock attendance ratio (Sun–Thu) */
  attendanceScore: number;
  compositeScore: number;
};

type Period = 'day' | 'week' | 'month';

const WEIGHT_PERF = 0.32;
const WEIGHT_TEAM_FORMS = 0.33;
const WEIGHT_OWN_FORMS = 0.2;
const WEIGHT_ATTENDANCE = 0.15;

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isHandledFormSubmission(reviewedAt: Date | null, status: string): boolean {
  if (reviewedAt != null) return true;
  return status === 'approved' || status === 'denied';
}

/** Expectations tuned to period length (heuristic benchmarks for “active” submission). */
function ownFormsScoreForPeriod(count: number, period: Period): number {
  if (period === 'day') return count >= 1 ? 100 : 42;
  if (period === 'week') return count >= 2 ? 100 : count >= 1 ? 78 : 45;
  return count >= 4 ? 100 : count >= 2 ? 78 : count >= 1 ? 58 : 35;
}

function attendanceScoreRow(expectedWeekdays?: number | null, absenceDays?: number | null): number {
  if (expectedWeekdays != null && expectedWeekdays > 0) {
    return clamp100((1 - (absenceDays ?? 0) / expectedWeekdays) * 100);
  }
  return 74;
}

/**
 * Perf review score mixes average star ratings (when present) with review volume vs team headcount.
 */
function perfReviewsScore(conducted: number, avgStars: number | null, teamSize: number): number {
  if (teamSize <= 0) return 88;
  if (conducted <= 0) return 36;
  const quality = avgStars != null ? (avgStars / 5) * 100 : 55;
  const volume = clamp100((conducted / Math.max(teamSize, 1)) * 100);
  return clamp100(quality * 0.58 + volume * 0.42);
}

function teamCoverageScore(teamTotal: number, handled: number): number {
  if (teamTotal <= 0) return 92;
  return clamp100((handled / teamTotal) * 100);
}

export function buildManagerRatingReport(opts: {
  period: Period;
  managers: {
    id: string;
    name: string;
    branchId: string;
    branchName: string;
    directReportIds: string[];
    userId: string | null;
  }[];
  /** Performance reviews in range */
  perfReviews: { employeeId: string; reviewedById: string | null; rating: number }[];
  /** Management forms in range (submittedAt-filtered upstream) */
  formSubmissions: { employeeId: string; reviewedAt: Date | null; status: string }[];
  /** Map reviewer user.id -> manager employee.id if user is tied to employee */
  managerEmployeeIdByUserId: Map<string, string | null>;
  /** Normalized user role for reviewer — only managers are credited for conducting reviews */
  reviewerRoleByUserId: Map<string, AppUserRole>;
  attendanceRows: Record<string, { expectedWeekdays: number | null | undefined; absenceDays: number | null | undefined }>;
}): ManagerRatingRow[] {
  const { reviewerRoleByUserId, managerEmployeeIdByUserId } = opts;

  const reviewerIsManagerEmployee = (reviewedById: string | null | undefined, managerEmpId: string): boolean => {
    if (!reviewedById) return false;
    const role = reviewerRoleByUserId.get(reviewedById);
    if (role !== 'manager') return false;
    const reviewerEmpId = managerEmployeeIdByUserId.get(reviewedById);
    return reviewerEmpId === managerEmpId;
  };

  const reportSetByManager = new Map(opts.managers.map((m) => [m.id, new Set(m.directReportIds)] as const));

  return opts.managers.map((m) => {
    const reportIds = reportSetByManager.get(m.id) ?? new Set<string>();
    let sumStars = 0;
    let starCount = 0;
    let conducted = 0;
    for (const r of opts.perfReviews) {
      if (!reportIds.has(r.employeeId)) continue;
      if (!reviewerIsManagerEmployee(r.reviewedById, m.id)) continue;
      conducted += 1;
      sumStars += r.rating;
      starCount += 1;
    }

    let teamFormSubmissions = 0;
    let teamFormsHandled = 0;
    let managerOwnForms = 0;

    for (const s of opts.formSubmissions) {
      if (s.employeeId === m.id) {
        managerOwnForms += 1;
        continue;
      }
      if (reportIds.has(s.employeeId)) {
        teamFormSubmissions += 1;
        if (isHandledFormSubmission(s.reviewedAt, s.status)) {
          teamFormsHandled += 1;
        }
      }
    }

    const perfReviewAvgStars = starCount > 0 ? Math.round((sumStars / starCount) * 10) / 10 : null;

    const perfReviewsScoreVal = perfReviewsScore(conducted, perfReviewAvgStars, reportIds.size);
    const teamFormsCoverageScoreVal = teamCoverageScore(teamFormSubmissions, teamFormsHandled);
    const managerOwnFormsScoreVal = ownFormsScoreForPeriod(managerOwnForms, opts.period);
    const attendanceRow = opts.attendanceRows[m.id];
    const attendanceScoreVal = attendanceScoreRow(attendanceRow?.expectedWeekdays, attendanceRow?.absenceDays);

    const compositeScore = clamp100(
      perfReviewsScoreVal * WEIGHT_PERF +
        teamFormsCoverageScoreVal * WEIGHT_TEAM_FORMS +
        managerOwnFormsScoreVal * WEIGHT_OWN_FORMS +
        attendanceScoreVal * WEIGHT_ATTENDANCE
    );

    return {
      managerId: m.id,
      managerName: m.name,
      branchId: m.branchId,
      branchName: m.branchName,
      teamSize: reportIds.size,
      perfReviewsConducted: conducted,
      perfReviewAvgStars,
      perfReviewsScore: perfReviewsScoreVal,
      teamFormSubmissions,
      teamFormsHandled,
      teamFormsCoverageScore: teamFormsCoverageScoreVal,
      managerOwnForms,
      managerOwnFormsScore: managerOwnFormsScoreVal,
      attendanceScore: attendanceScoreVal,
      compositeScore,
    };
  });
}
