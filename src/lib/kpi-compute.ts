import type { PrismaClient } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { parseTemplateFields } from '@/lib/formTemplate';
import { photoQualityContribution, photoSubmissionCountsInQuality } from '@/lib/photo-kpi';
import {
  answerQualityParts,
  assistantManagerKpi,
  DEFAULT_WEIGHTS,
  managerKpi,
  officialKpiAllowed,
  PHOTO_KPI_WEIGHTS_APPROVED_KEY,
  photoKpiWeightsApproved,
  resolveStaffWeights,
  staffKpi,
  withHrNotesKpi,
  type AmEvidence,
  type MgrEvidence,
  type StaffEvidence,
} from '@/lib/kpi-engine';
import {
  attributedToEmployee,
  closedWithinSla,
  countQuestionKeyRepeats,
  criticalSlaParts,
  isApprovedEmployeeError,
  slaMsForSeverity,
  type IssueForKpi,
} from '@/lib/kpi-evidence';
import { isQcInspectionDomain } from '@/lib/qc-domains';

export type KpiRange = 'day' | 'week' | 'month';

export function dayPeriodKey(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
}

/** ISO week in Asia/Amman, e.g. 2026-W42. */
export function weekPeriodKey(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(now, timeZone, "RRRR-'W'II");
}

export function monthPeriodKey(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(now, timeZone, 'yyyy-MM');
}

export function periodKeyForRange(range: KpiRange, now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  if (range === 'week') return weekPeriodKey(now, timeZone);
  if (range === 'month') return monthPeriodKey(now, timeZone);
  return dayPeriodKey(now, timeZone);
}

export function resolveKpiPeriod(raw: string | null, now = new Date()): { range: KpiRange; periodKey: string } {
  const v = (raw ?? '').trim();
  if (v === 'day' || v === 'week' || v === 'month') return { range: v, periodKey: periodKeyForRange(v, now) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { range: 'day', periodKey: v };
  if (/^\d{4}-W\d{2}$/.test(v)) return { range: 'week', periodKey: v };
  if (/^\d{4}-\d{2}$/.test(v)) return { range: 'month', periodKey: v };
  return { range: 'day', periodKey: dayPeriodKey(now) };
}

export function kpiInstantInPeriod(iso: Date, periodKey: string, timeZone = DEFAULT_APP_TIMEZONE): boolean {
  if (/^\d{4}-W\d{2}$/.test(periodKey)) {
    return formatInTimeZone(iso, timeZone, "RRRR-'W'II") === periodKey;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodKey)) {
    return formatInTimeZone(iso, timeZone, 'yyyy-MM-dd') === periodKey;
  }
  if (/^\d{4}-\d{2}$/.test(periodKey)) {
    return formatInTimeZone(iso, timeZone, 'yyyy-MM') === periodKey;
  }
  return false;
}

function inPeriod(iso: Date, periodKey: string, timeZone = DEFAULT_APP_TIMEZONE): boolean {
  return kpiInstantInPeriod(iso, periodKey, timeZone);
}

async function configInt(prisma: PrismaClient, key: string, fallback: number): Promise<number> {
  const row = await prisma.qcAppConfig.findUnique({ where: { key } });
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : fallback;
}

function toIssueForKpi(i: {
  id: string;
  createdAt: Date;
  closedAt: Date | null;
  verifiedAt: Date | null;
  status: string;
  severity: string;
  questionKey: string;
  assigneeEmployeeId: string | null;
  inspectionTask: { assigneeEmployeeId: string } | null;
  responsibilityDecision: { classification: string; approvedAt: Date | null } | null;
}): IssueForKpi {
  return {
    id: i.id,
    createdAt: i.createdAt,
    closedAt: i.closedAt,
    verifiedAt: i.verifiedAt,
    status: i.status,
    severity: i.severity,
    questionKey: i.questionKey,
    assigneeEmployeeId: i.assigneeEmployeeId,
    inspectionAssigneeEmployeeId: i.inspectionTask?.assigneeEmployeeId ?? null,
    responsibilityClassification: i.responsibilityDecision?.classification ?? null,
    responsibilityApprovedAt: i.responsibilityDecision?.approvedAt ?? null,
  };
}

export async function computeAndStoreEmployeeKpi(
  prisma: PrismaClient,
  employeeId: string,
  periodKey: string
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, role: true, branchId: true },
  });
  if (!employee) throw new Error('Employee not found');

  const cycles = await configInt(prisma, 'official_kpi_cycles_completed', 0);
  const publicationApproved = await configInt(prisma, 'official_kpi_publication_approved', 0);
  const storeMode = officialKpiAllowed(cycles) && publicationApproved >= 1 ? 'official' : 'operational';
  const effectiveStoreMode = 'operational';

  const subjectRole =
    employee.role === 'manager'
      ? 'manager'
      : employee.role === 'assistant_manager'
        ? 'assistant_manager'
        : 'staff';

  const weightRow = await prisma.kpiWeightConfig.findFirst({
    where: { subjectRole },
    orderBy: { versionNumber: 'desc' },
  });
  const photoWeightsFlag = await prisma.qcAppConfig.findUnique({
    where: { key: PHOTO_KPI_WEIGHTS_APPROVED_KEY },
    select: { value: true },
  });
  const storedWeights = weightRow ? (JSON.parse(weightRow.weightsJson) as Record<string, number>) : undefined;
  const weights =
    subjectRole === 'staff'
      ? resolveStaffWeights(storedWeights, photoKpiWeightsApproved(photoWeightsFlag?.value))
      : storedWeights;

  const tasks = await prisma.inspectionTask.findMany({
    where: {
      OR: [{ assigneeEmployeeId: employeeId }, { branchId: employee.branchId }],
    },
    include: {
      templateVersion: { select: { fieldsJson: true, category: true, title: true } },
      schedule: { select: { window: true } },
    },
  });
  const periodTasks = tasks.filter((t) => inPeriod(t.dueAt, periodKey));

  const own = periodTasks.filter((t) => t.assigneeEmployeeId === employeeId);
  const eligibleDue = own.filter((t) => !['excused', 'cancelled'].includes(t.status));
  const completed = own.filter((t) => t.status === 'completed');
  const onTime = completed.filter((t) => t.submittedAt && t.submittedAt <= t.dueAt);

  const submissions = await prisma.managementFormSubmission.findMany({
    where: {
      id: { in: completed.map((t) => t.submissionId).filter((x): x is string => !!x) },
      status: { notIn: ['denied'] },
    },
    include: { templateVersion: { select: { fieldsJson: true, category: true } } },
  });

  let qualityScoreSum = 0;
  let qualityWeightSum = 0;
  let weightedAnswers = 0;
  let productQualitySum = 0;
  let productQualityWeight = 0;
  let cleaningSum = 0;
  let cleaningWeight = 0;
  let foodSafetySum = 0;
  let foodSafetyWeight = 0;

  for (const sub of submissions) {
    // Guided-inspection submissions are the operational QC record (no separate review step).
    const fields = parseTemplateFields(sub.templateVersion?.fieldsJson ?? '[]');
    const answers = JSON.parse(sub.answersJson || '{}') as Record<string, string>;
    const parts = answerQualityParts(fields, answers);
    qualityScoreSum += parts.scoreSum;
    qualityWeightSum += parts.weightSum;
    weightedAnswers += parts.count;
    const cat = sub.templateVersion?.category ?? '';
    if (cat === 'product_quality' || cat === 'barista_qc') {
      productQualitySum += parts.scoreSum;
      productQualityWeight += parts.weightSum;
    }
    if (cat === 'cleaning') {
      cleaningSum += parts.scoreSum;
      cleaningWeight += parts.weightSum;
    }
    if (cat === 'food_safety') {
      foodSafetySum += parts.scoreSum;
      foodSafetyWeight += parts.weightSum;
    }
  }

  const issues = await prisma.issue.findMany({
    where: { branchId: employee.branchId },
    include: {
      responsibilityDecision: true,
      inspectionTask: { select: { assigneeEmployeeId: true } },
    },
  });
  const mapped = issues.map(toIssueForKpi);
  const periodIssues = mapped.filter((i) => inPeriod(i.createdAt, periodKey));
  const assignedIssues = periodIssues.filter((i) => i.assigneeEmployeeId === employeeId);

  const rules = await prisma.escalationRule.findMany({ where: { active: true } });
  const repeatWindowDays = await configInt(prisma, 'repeat_issue_window_days', 14);
  const windowMs = repeatWindowDays * 24 * 3600_000;

  const staffAttributed = mapped.filter(
    (i) => attributedToEmployee(i, employeeId) && isApprovedEmployeeError(i)
  );
  const staffApprovedEe = staffAttributed.length > 0;
  const staffRepeats = countQuestionKeyRepeats(staffAttributed, windowMs);

  const branchAttributed = mapped.filter((i) => isApprovedEmployeeError(i));
  const branchApprovedEe = branchAttributed.length > 0;
  const branchRepeats = countQuestionKeyRepeats(branchAttributed, windowMs);

  const closedOnTime = assignedIssues.filter((i) =>
    closedWithinSla(i, slaMsForSeverity(i.severity, rules))
  ).length;
  const periodClosedOnTime = periodIssues.filter((i) =>
    closedWithinSla(i, slaMsForSeverity(i.severity, rules))
  ).length;

  const photoTasks = await prisma.photoCheckTask.findMany({
    where: { assigneeEmployeeId: employeeId },
    include: { submission: { select: { status: true, aiScore: true, aiVerdict: true, submittedAt: true } } },
  });
  const periodPhotoTasks = photoTasks.filter((t) => inPeriod(t.dueAt, periodKey));
  const eligiblePhoto = periodPhotoTasks.filter((t) => !['cancelled', 'excused'].includes(t.status));
  const completedPhoto = eligiblePhoto.filter((t) => t.status === 'completed');
  const onTimePhoto = completedPhoto.filter((t) => t.submission?.submittedAt && t.submission.submittedAt <= t.dueAt);
  const reviewedPhoto = completedPhoto.filter(
    (t) => t.submission?.status === 'approved' || t.submission?.status === 'rejected'
  );
  const qualityRows = reviewedPhoto.filter((t) => photoSubmissionCountsInQuality(t.submission));
  const qualitySum = qualityRows.reduce((s, t) => s + photoQualityContribution(t.submission), 0);
  const uniqueTaskDays = new Set(eligiblePhoto.map((t) => t.periodKey)).size;
  const uniqueCompletedDays = new Set(completedPhoto.map((t) => t.periodKey)).size;

  const staffEv: StaffEvidence = {
    onTimeCompleted: onTime.length,
    eligibleDue: eligibleDue.length,
    qualityScoreSum,
    qualityWeightSum,
    weightedAnswers,
    completedTasks: completed.length,
    assignedTasks: eligibleDue.length,
    productQualitySum,
    productQualityWeight,
    cleaningSum,
    cleaningWeight,
    correctiveClosedOnTime: closedOnTime,
    correctiveEligible: assignedIssues.length,
    repeatCount: staffRepeats,
    exposureCount: completed.length,
    approvedEmployeeError: staffApprovedEe,
    photoSubmitted: completedPhoto.length,
    photoExpected: eligiblePhoto.length,
    photoUniqueDays: uniqueCompletedDays,
    photoDaysElapsed: uniqueTaskDays,
    photoApproved: reviewedPhoto.filter((t) => t.submission?.status === 'approved').length,
    photoReviewed: reviewedPhoto.length,
    photoQualitySum: qualitySum,
    photoQualityCount: qualityRows.length,
  };

  const branchDue = periodTasks.filter((t) => !['excused', 'cancelled'].includes(t.status));
  const branchCompleted = branchDue.filter((t) => t.status === 'completed');
  const openingClosing = own.filter((t) => t.schedule.window === 'opening' || t.schedule.window === 'closing');

  const amEv: AmEvidence = {
    branchCompleted: branchCompleted.length,
    branchDue: branchDue.length,
    issuesResolvedOnTime: periodClosedOnTime,
    issuesEligible: periodIssues.length,
    staffFollowupDone: periodIssues.filter((i) =>
      ['acknowledged', 'in_progress', 'fixed', 'verified', 'closed'].includes(i.status)
    ).length,
    staffFollowupEligible: periodIssues.length,
    openingClosingOnTime: openingClosing.filter(
      (t) => t.status === 'completed' && t.submittedAt && t.submittedAt <= t.dueAt
    ).length,
    openingClosingDue: openingClosing.filter((t) => !['excused', 'cancelled'].includes(t.status)).length,
    repeatCount: branchRepeats,
    exposureCount: branchCompleted.length,
    productCleaningSum: productQualitySum + cleaningSum,
    productCleaningWeight: productQualityWeight + cleaningWeight,
    correctiveClosedOnTime: closedOnTime,
    correctiveEligible: assignedIssues.length,
    approvedEmployeeError: branchApprovedEe,
  };

  const slaHoursRow = rules.find((r) => r.severity === 'critical');
  const slaMs = (slaHoursRow?.slaHours ?? 24) * 3600_000;
  const crit = criticalSlaParts(mapped, slaMs, Date.now(), (end) => inPeriod(end, periodKey));

  const mgrEv: MgrEvidence = {
    overallQcSum: qualityScoreSum,
    overallQcWeight: qualityWeightSum,
    criticalResolvedWithinSla: crit.resolvedWithin,
    criticalResolvedInPeriod: crit.resolvedInPeriod,
    criticalOverdueUnresolved: crit.overdueUnresolved,
    correctiveClosedOnTime: periodClosedOnTime,
    correctiveEligible: periodIssues.length,
    checklistCompleted: branchCompleted.length,
    checklistDue: branchDue.length,
    repeatCount: branchRepeats,
    exposureCount: branchCompleted.length,
    productQualitySum,
    productQualityWeight,
    foodSafetySum,
    foodSafetyWeight,
    teamImprovementDelta: null,
    approvedEmployeeError: branchApprovedEe,
  };

  const hrNoteRows = await prisma.hrNote.findMany({
    where: { employeeId },
    select: { score: true, createdAt: true },
  });
  const hrScores = hrNoteRows.filter((n) => inPeriod(n.createdAt, periodKey)).map((n) => n.score);

  const base =
    subjectRole === 'manager'
      ? managerKpi(mgrEv, (weights as unknown as typeof DEFAULT_WEIGHTS.manager) ?? DEFAULT_WEIGHTS.manager)
      : subjectRole === 'assistant_manager'
        ? assistantManagerKpi(
            amEv,
            (weights as unknown as typeof DEFAULT_WEIGHTS.assistant_manager) ?? DEFAULT_WEIGHTS.assistant_manager
          )
        : staffKpi(staffEv, (weights as unknown as typeof DEFAULT_WEIGHTS.staff) ?? DEFAULT_WEIGHTS.staff);
  const result = withHrNotesKpi(base, hrScores);

  const amProvisional = subjectRole === 'assistant_manager';
  const explanation = {
    mode: effectiveStoreMode,
    purpose: 'operational_hr_review_only',
    employmentDecisionUse: false,
    subjectRole,
    periodKey,
    officialPublicationAllowed: false,
    officialCyclesCompleted: cycles,
    officialWouldBeAllowed: officialKpiAllowed(cycles) && publicationApproved >= 1,
    individualScorePublished: !amProvisional,
    assistantManagerAttribution: amProvisional ? 'provisional_whole_branch' : undefined,
    components: result.components,
    total: result.total,
    displayTotal: amProvisional ? null : result.total,
    usedWeight: result.usedWeight,
    note: amProvisional
      ? 'Assistant Manager scores stay provisional whole-branch until a duty roster is approved. Not an individual published score. Not used for salary, discipline, promotion, or termination.'
      : 'Operational performance indicator for internal HR review only. Not used automatically for salary, bonus, discipline, promotion, or termination. HR Notes (0–10) average into this score. HR cannot overwrite the total.',
    aiMustNotCalculate: true,
    storeModeUnused: storeMode,
  };

  await prisma.kpiPeriodScore.upsert({
    where: {
      employeeId_periodKey_mode: { employeeId, periodKey, mode: effectiveStoreMode },
    },
    update: {
      subjectRole,
      total: result.total,
      explanationJson: JSON.stringify(explanation),
    },
    create: {
      employeeId,
      subjectRole,
      periodKey,
      mode: effectiveStoreMode,
      total: result.total,
      explanationJson: JSON.stringify(explanation),
    },
  });

  return explanation;
}

export async function computeAndStoreCurrentEmployeeKpis(
  prisma: PrismaClient,
  employeeId: string,
  now = new Date()
) {
  const day = await computeAndStoreEmployeeKpi(prisma, employeeId, dayPeriodKey(now));
  const week = await computeAndStoreEmployeeKpi(prisma, employeeId, weekPeriodKey(now));
  const month = await computeAndStoreEmployeeKpi(prisma, employeeId, monthPeriodKey(now));
  return { day, week, month };
}

export function isInspectionCategory(category: string): boolean {
  return isQcInspectionDomain(category) || category === 'opening' || category === 'closing';
}
