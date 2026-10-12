/**
 * Deterministic KPI engine. AI must never write these values.
 * Official publication requires two completed monthly shadow cycles (QcAppConfig).
 */
import type { FormFieldDef } from '@/lib/formTemplate';

export type ComponentStatus = 'scored' | 'provisional' | 'not_rated';

export type KpiComponent = {
  key: string;
  weight: number;
  raw: number | null;
  status: ComponentStatus;
  evidenceCount: number;
};

export const DEFAULT_WEIGHTS = {
  staff: {
    qc_task_execution: 25,
    checklist_quality: 20,
    timeliness: 15,
    product_quality: 15,
    cleaning_sop: 10,
    corrective_actions: 10,
    recurring_issues: 5,
    // Photo keys stay 0 here. Owner-approved weights apply only when
    // QcAppConfig photo_kpi_weights_approved=1 (see APPROVED_PHOTO_KPI_WEIGHTS).
    photo_submission: 0,
    photo_consistency: 0,
    photo_approval: 0,
    photo_quality: 0,
  },
  assistant_manager: {
    branch_completion: 20,
    issue_resolution_speed: 20,
    staff_followup: 15,
    opening_closing: 15,
    repeat_issues: 10,
    product_cleaning: 10,
    corrective_actions: 10,
  },
  manager: {
    overall_branch_qc: 25,
    critical_issues: 15,
    corrective_action_speed: 15,
    checklist_completion: 10,
    repeat_issue_reduction: 10,
    product_quality: 10,
    food_safety: 10,
    team_improvement: 5,
  },
} as const;

/** Owner-approved 2026-10-12. Applied when photo_kpi_weights_approved=1. */
export const APPROVED_PHOTO_KPI_WEIGHTS = {
  photo_submission: 20,
  photo_consistency: 15,
  photo_approval: 15,
  photo_quality: 15,
} as const;

/** @deprecated Use APPROVED_PHOTO_KPI_WEIGHTS. Kept so older tests still compile. */
export const PROPOSED_PHOTO_KPI_WEIGHTS = APPROVED_PHOTO_KPI_WEIGHTS;

export const PHOTO_KPI_WEIGHTS_APPROVED_KEY = 'photo_kpi_weights_approved';

export function photoKpiWeightsApproved(configValue: string | null | undefined): boolean {
  return configValue === '1';
}

export function resolveStaffWeights(
  stored: Partial<Record<string, number>> | undefined,
  photoApproved: boolean
): (typeof DEFAULT_WEIGHTS)['staff'] {
  const w = { ...DEFAULT_WEIGHTS.staff, ...(stored ?? {}) };
  if (!photoApproved) {
    return {
      ...w,
      photo_submission: 0,
      photo_consistency: 0,
      photo_approval: 0,
      photo_quality: 0,
    };
  }
  return {
    ...w,
    photo_submission:
      (stored?.photo_submission ?? 0) > 0 ? Number(stored?.photo_submission) : APPROVED_PHOTO_KPI_WEIGHTS.photo_submission,
    photo_consistency:
      (stored?.photo_consistency ?? 0) > 0 ? Number(stored?.photo_consistency) : APPROVED_PHOTO_KPI_WEIGHTS.photo_consistency,
    photo_approval:
      (stored?.photo_approval ?? 0) > 0 ? Number(stored?.photo_approval) : APPROVED_PHOTO_KPI_WEIGHTS.photo_approval,
    photo_quality:
      (stored?.photo_quality ?? 0) > 0 ? Number(stored?.photo_quality) : APPROVED_PHOTO_KPI_WEIGHTS.photo_quality,
  };
}

export type StaffEvidence = {
  onTimeCompleted: number;
  eligibleDue: number;
  qualityScoreSum: number;
  qualityWeightSum: number;
  weightedAnswers: number;
  completedTasks: number;
  assignedTasks: number;
  productQualitySum: number;
  productQualityWeight: number;
  cleaningSum: number;
  cleaningWeight: number;
  correctiveClosedOnTime: number;
  correctiveEligible: number;
  repeatCount: number;
  exposureCount: number;
  approvedEmployeeError: boolean;
  photoSubmitted?: number;
  photoExpected?: number;
  photoUniqueDays?: number;
  photoDaysElapsed?: number;
  photoApproved?: number;
  photoReviewed?: number;
  photoQualitySum?: number;
  photoQualityCount?: number;
};

/** Checklist quality: ratio uses weights; Scored/Provisional uses answer count (spec §B). */
export function checklistQualityComponent(
  key: string,
  weight: number,
  scoreSum: number,
  weightSum: number,
  answerCount: number,
  scoredMin = 20
): KpiComponent {
  if (answerCount <= 0 || weightSum <= 0) {
    return { key, weight, raw: null, status: 'not_rated', evidenceCount: 0 };
  }
  const raw = Math.max(0, Math.min(100, (scoreSum / weightSum) * 100));
  if (answerCount >= scoredMin) return { key, weight, raw, status: 'scored', evidenceCount: answerCount };
  return { key, weight, raw, status: 'provisional', evidenceCount: answerCount };
}

export function componentFromRatio(
  key: string,
  weight: number,
  numerator: number,
  denominator: number,
  scoredMin: number,
  provisionalMin = 1
): KpiComponent {
  if (denominator <= 0) {
    return { key, weight, raw: null, status: 'not_rated', evidenceCount: 0 };
  }
  const raw = Math.max(0, Math.min(100, (numerator / denominator) * 100));
  if (denominator >= scoredMin) return { key, weight, raw, status: 'scored', evidenceCount: denominator };
  if (denominator >= provisionalMin) {
    return { key, weight, raw, status: 'provisional', evidenceCount: denominator };
  }
  return { key, weight, raw: null, status: 'not_rated', evidenceCount: denominator };
}

/** Recurrence: max(0, 1 − rate) * 100. Never 100% with zero exposure. */
export function recurringIssuesComponent(
  weight: number,
  repeatCount: number,
  exposureCount: number,
  minExposure = 10
): KpiComponent {
  if (exposureCount <= 0) {
    return { key: 'recurring_issues', weight, raw: null, status: 'not_rated', evidenceCount: 0 };
  }
  const rate = repeatCount / exposureCount;
  const raw = Math.max(0, (1 - rate) * 100);
  if (exposureCount >= minExposure) {
    return { key: 'recurring_issues', weight, raw, status: 'scored', evidenceCount: exposureCount };
  }
  return { key: 'recurring_issues', weight, raw, status: 'provisional', evidenceCount: exposureCount };
}

/**
 * Critical SLA: resolved-within-SLA ÷ (resolved in period + overdue unresolved).
 * Open overdue criticals count as misses.
 */
export function criticalIssuesComponent(
  weight: number,
  resolvedWithinSla: number,
  resolvedInPeriod: number,
  overdueUnresolved: number
): KpiComponent {
  const denominator = resolvedInPeriod + overdueUnresolved;
  return componentFromRatio('critical_issues', weight, resolvedWithinSla, denominator, 5, 1);
}

export function combineWeighted(components: KpiComponent[]): {
  total: number | null;
  usedWeight: number;
  components: KpiComponent[];
} {
  const scored = components.filter((c) => c.status === 'scored' && c.raw != null);
  const usedWeight = scored.reduce((s, c) => s + c.weight, 0);
  if (usedWeight <= 0) return { total: null, usedWeight: 0, components };
  const total = scored.reduce((s, c) => s + (c.raw! * c.weight) / usedWeight, 0);
  return { total, usedWeight, components };
}

/** HR 0–10 notes. Average in the period maps to 0–100. Above 5 is good, below 5 is bad. */
export const HR_NOTES_KPI_WEIGHT = 20;

export type HrNoteTone = 'good' | 'bad' | 'neutral';

export function hrNoteTone(score: number): HrNoteTone {
  if (score > 5) return 'good';
  if (score < 5) return 'bad';
  return 'neutral';
}

export function hrNotesComponent(scores: number[], weight = HR_NOTES_KPI_WEIGHT): KpiComponent {
  if (!scores.length) {
    return { key: 'hr_notes', weight, raw: null, status: 'not_rated', evidenceCount: 0 };
  }
  const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
  const raw = Math.max(0, Math.min(100, avg * 10));
  return { key: 'hr_notes', weight, raw, status: 'scored', evidenceCount: scores.length };
}

export function withHrNotesKpi(
  result: { total: number | null; usedWeight: number; components: KpiComponent[] },
  scores: number[]
) {
  return combineWeighted([...result.components, hrNotesComponent(scores)]);
}

export function staffKpi(ev: StaffEvidence, weights = DEFAULT_WEIGHTS.staff) {
  const w = { ...DEFAULT_WEIGHTS.staff, ...weights };
  const mayPenalize = ev.approvedEmployeeError;
  const comps: KpiComponent[] = [
    componentFromRatio('qc_task_execution', w.qc_task_execution, ev.completedTasks, ev.assignedTasks, 10),
    checklistQualityComponent(
      'checklist_quality',
      w.checklist_quality,
      ev.qualityScoreSum,
      ev.qualityWeightSum,
      ev.weightedAnswers,
      20
    ),
    componentFromRatio('timeliness', w.timeliness, ev.onTimeCompleted, ev.eligibleDue, 10),
    componentFromRatio('product_quality', w.product_quality, ev.productQualitySum, ev.productQualityWeight, 10),
    componentFromRatio('cleaning_sop', w.cleaning_sop, ev.cleaningSum, ev.cleaningWeight, 10),
    componentFromRatio(
      'corrective_actions',
      w.corrective_actions,
      ev.correctiveClosedOnTime,
      ev.correctiveEligible,
      5
    ),
    mayPenalize
      ? recurringIssuesComponent(w.recurring_issues, ev.repeatCount, ev.exposureCount)
      : { key: 'recurring_issues', weight: w.recurring_issues, raw: null, status: 'not_rated', evidenceCount: 0 },
    ...(w.photo_submission > 0
      ? [componentFromRatio('photo_submission', w.photo_submission, ev.photoSubmitted ?? 0, ev.photoExpected ?? 0, 1)]
      : []),
    ...(w.photo_consistency > 0
      ? [componentFromRatio('photo_consistency', w.photo_consistency, ev.photoUniqueDays ?? 0, ev.photoDaysElapsed ?? 0, 1)]
      : []),
    ...(w.photo_approval > 0
      ? [componentFromRatio('photo_approval', w.photo_approval, ev.photoApproved ?? 0, ev.photoReviewed ?? 0, 1)]
      : []),
    ...(w.photo_quality > 0
      ? [componentFromRatio('photo_quality', w.photo_quality, ev.photoQualitySum ?? 0, (ev.photoQualityCount ?? 0) * 100, 1)]
      : []),
  ];
  return combineWeighted(comps);
}

export function answerQualityParts(
  fields: FormFieldDef[],
  answers: Record<string, string>
): { scoreSum: number; weightSum: number; count: number } {
  let scoreSum = 0;
  let weightSum = 0;
  let count = 0;
  for (const f of fields) {
    const w = f.weight ?? 0;
    if (w <= 0) continue;
    const v = answers[f.key];
    if (v === undefined) continue;
    const pass = f.passValues?.length ? f.passValues.includes(v) : v !== 'no' && v !== 'fail' && v !== 'false';
    scoreSum += pass ? w : 0;
    weightSum += w;
    count += 1;
  }
  return { scoreSum, weightSum, count };
}

export type AmEvidence = {
  branchCompleted: number;
  branchDue: number;
  issuesResolvedOnTime: number;
  issuesEligible: number;
  staffFollowupDone: number;
  staffFollowupEligible: number;
  openingClosingOnTime: number;
  openingClosingDue: number;
  repeatCount: number;
  exposureCount: number;
  productCleaningSum: number;
  productCleaningWeight: number;
  correctiveClosedOnTime: number;
  correctiveEligible: number;
  approvedEmployeeError: boolean;
};

export type MgrEvidence = {
  overallQcSum: number;
  overallQcWeight: number;
  criticalResolvedWithinSla: number;
  criticalResolvedInPeriod: number;
  criticalOverdueUnresolved: number;
  correctiveClosedOnTime: number;
  correctiveEligible: number;
  checklistCompleted: number;
  checklistDue: number;
  repeatCount: number;
  exposureCount: number;
  productQualitySum: number;
  productQualityWeight: number;
  foodSafetySum: number;
  foodSafetyWeight: number;
  teamImprovementDelta: number | null;
  approvedEmployeeError: boolean;
};

export function assistantManagerKpi(ev: AmEvidence, weights = DEFAULT_WEIGHTS.assistant_manager) {
  const mayPenalize = ev.approvedEmployeeError;
  const comps: KpiComponent[] = [
    componentFromRatio('branch_completion', weights.branch_completion, ev.branchCompleted, ev.branchDue, 10),
    componentFromRatio(
      'issue_resolution_speed',
      weights.issue_resolution_speed,
      ev.issuesResolvedOnTime,
      ev.issuesEligible,
      5
    ),
    componentFromRatio('staff_followup', weights.staff_followup, ev.staffFollowupDone, ev.staffFollowupEligible, 5),
    componentFromRatio('opening_closing', weights.opening_closing, ev.openingClosingOnTime, ev.openingClosingDue, 8),
    mayPenalize
      ? recurringIssuesComponent(weights.repeat_issues, ev.repeatCount, ev.exposureCount)
      : { key: 'repeat_issues', weight: weights.repeat_issues, raw: null, status: 'not_rated', evidenceCount: 0 },
    componentFromRatio(
      'product_cleaning',
      weights.product_cleaning,
      ev.productCleaningSum,
      ev.productCleaningWeight,
      10
    ),
    componentFromRatio(
      'corrective_actions',
      weights.corrective_actions,
      ev.correctiveClosedOnTime,
      ev.correctiveEligible,
      5
    ),
  ];
  return combineWeighted(comps);
}

export function managerKpi(ev: MgrEvidence, weights = DEFAULT_WEIGHTS.manager) {
  const mayPenalize = ev.approvedEmployeeError;
  const team: KpiComponent =
    ev.teamImprovementDelta == null
      ? { key: 'team_improvement', weight: weights.team_improvement, raw: null, status: 'not_rated', evidenceCount: 0 }
      : {
          key: 'team_improvement',
          weight: weights.team_improvement,
          raw: Math.max(0, Math.min(100, 50 + ev.teamImprovementDelta)),
          status: 'provisional',
          evidenceCount: 1,
        };
  const comps: KpiComponent[] = [
    componentFromRatio('overall_branch_qc', weights.overall_branch_qc, ev.overallQcSum, ev.overallQcWeight, 20),
    criticalIssuesComponent(
      weights.critical_issues,
      ev.criticalResolvedWithinSla,
      ev.criticalResolvedInPeriod,
      ev.criticalOverdueUnresolved
    ),
    componentFromRatio(
      'corrective_action_speed',
      weights.corrective_action_speed,
      ev.correctiveClosedOnTime,
      ev.correctiveEligible,
      5
    ),
    componentFromRatio('checklist_completion', weights.checklist_completion, ev.checklistCompleted, ev.checklistDue, 10),
    mayPenalize
      ? recurringIssuesComponent(weights.repeat_issue_reduction, ev.repeatCount, ev.exposureCount)
      : {
          key: 'repeat_issue_reduction',
          weight: weights.repeat_issue_reduction,
          raw: null,
          status: 'not_rated',
          evidenceCount: 0,
        },
    componentFromRatio('product_quality', weights.product_quality, ev.productQualitySum, ev.productQualityWeight, 10),
    componentFromRatio('food_safety', weights.food_safety, ev.foodSafetySum, ev.foodSafetyWeight, 10),
    team,
  ];
  return combineWeighted(comps);
}

export function officialKpiAllowed(cyclesCompleted: number): boolean {
  return cyclesCompleted >= 2;
}
