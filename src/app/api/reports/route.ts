import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';
import { weekStartKeysBetweenRange, weekStartKeysOverlappingMonth } from '@/lib/weekly-ratings';
import { getSalaryDeductionReport } from '@/lib/salary-deduction-report';
import { buildQcScoreReport, isQcScoreableFormAnswers } from '@/lib/qc-form-score-report';
import { parseTemplateFields } from '@/lib/formTemplate';
import { resolveQcScoringProfileForSubmission } from '@/lib/qc-scoring-profile';
import { maybePurgeOldManagementFormSubmissions } from '@/lib/form-submission-retention';
import { maybeRunAutoClockOutIfDue } from '@/lib/auto-clock-out-daily';
import { buildCashFormReport } from '@/lib/cash-form-report';
import { buildManagerRatingReport } from '@/lib/manager-rating-report';
import { normalizeUserRole } from '@/lib/formVisibility';

export async function GET(req: NextRequest) {
  const session = await requireOwner();
  await maybePurgeOldManagementFormSubmissions(prisma);
  try {
    await maybeRunAutoClockOutIfDue();
  } catch (e) {
    console.error('[reports GET] maybe auto clock-out 4am failed', e);
  }
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'month';
  const branchId = searchParams.get('branchId') ?? '';
  const monthParam = searchParams.get('month') ?? ''; // YYYY-MM for historical period
  const salaryMonthParam = searchParams.get('salaryMonth') ?? ''; // YYYY-MM for salary report

  let refDate = new Date();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number);
    refDate = new Date(y, m - 1, 15);
  }

  let start: Date;
  let end: Date;
  if (period === 'day') {
    start = startOfDay(refDate);
    end = endOfDay(refDate);
  } else if (period === 'week') {
    start = startOfWeek(refDate);
    end = endOfWeek(refDate);
  } else {
    start = startOfMonth(refDate);
    end = endOfMonth(refDate);
  }

  const branchFilter = branchId ? { branchId } : {};
  const now = new Date();
  const alertsWindowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);

  const statusFilter = { status: { not: 'terminated' as const } };
  const [
    employees,
    advances,
    submissions,
    salaryRows,
    newHires,
    headcountOverTime,
    branchOverview,
    leaveData,
    leaveRequestsRaw,
    formSubmissions,
    transfers,
    reviews,
    documents,
    managers,
    timeClockAlertsByBranch,
    ownerTimeClockAlerts,
    branchesOrdered,
    cashFormSubmissions,
    managementFormsAgg,
    perfReviewsAgg,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: { ...branchFilter, ...statusFilter },
      select: { id: true, branchId: true, name: true, joinDate: true, employmentType: true, branch: { select: { name: true } } },
    }),
    prisma.advance.findMany({
      where: {
        requestedAt: { gte: start, lte: end },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      include: { employee: { include: { branch: true } } },
    }),
    prisma.qcSubmission.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        employee: { include: { branch: true } },
        assignment: { include: { checklist: true } },
        photos: { select: { id: true, filePath: true } },
      },
      // Cap payload: very busy months + photos metadata can exceed Worker CPU on Cloudflare.
      take: 3500,
      orderBy: { submittedAt: 'desc' },
    }),
    getSalaryDeductionReport(
      prisma,
      salaryMonthParam && /^\d{4}-\d{2}$/.test(salaryMonthParam) ? salaryMonthParam : format(refDate, 'yyyy-MM'),
      branchId
    ),
    getNewHires(start, end, branchId),
    getHeadcountOverTime(branchId),
    getBranchOverview(branchId, start, end),
    getLeaveReport(start, end, branchId),
    prisma.leaveRequest.findMany({
      where: {
        startDate: { lte: end },
        endDate: { gte: start },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: { id: true, employeeId: true, status: true },
    }),
    prisma.managementFormSubmission.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        template: { select: { title: true, category: true, fieldsJson: true } },
        employee: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 200,
    }),
    prisma.employeeTransfer.findMany({
      where: {
        transferredAt: { gte: start, lte: end },
        ...(branchId ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] } : {}),
      },
      include: { employee: { select: { name: true } }, fromBranch: { select: { name: true } }, toBranch: { select: { name: true } } },
      orderBy: { transferredAt: 'desc' },
      take: 100,
    }),
    prisma.performanceReview.findMany({
      where: {
        reviewedAt: { gte: start, lte: end },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      include: { employee: { select: { name: true, branch: { select: { name: true } } } } },
      orderBy: { reviewedAt: 'desc' },
      take: 100,
    }),
    prisma.employeeDocument.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      include: { employee: { select: { name: true, branch: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.employee.findMany({
      where: {
        role: 'manager',
        status: { not: 'terminated' },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: { select: { name: true } },
        directReports: { select: { id: true }, where: { status: { not: 'terminated' } } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.awaySession.groupBy({
      by: ['branchId'],
      where: {
        startedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      _count: { _all: true },
    }),
    prisma.inboxNotification.findMany({
      where: {
        userId: session.user.id,
        category: { in: ['time_clock', 'manager_time_clock_report'] },
        createdAt: { gte: alertsWindowStart, lte: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.branch.findMany({
      where: branchId ? { id: branchId } : undefined,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.managementFormSubmission.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        template: { category: 'cash' },
        status: { not: 'denied' },
        ...(branchId ? { branchId } : {}),
      },
      select: { branchId: true, answersJson: true, status: true },
      take: 8000,
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.managementFormSubmission.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      select: { employeeId: true, reviewedAt: true, status: true },
      take: 12000,
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.performanceReview.findMany({
      where: {
        reviewedAt: { gte: start, lte: end },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: { employeeId: true, reviewedById: true, rating: true },
      take: 8000,
      orderBy: { reviewedAt: 'desc' },
    }),
  ]);

  const cashReport = buildCashFormReport(cashFormSubmissions, branchesOrdered);

  const headcountByBranch = employees.reduce((acc, e) => {
    acc[e.branchId] = (acc[e.branchId] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const attendance = await getAttendanceReport(employees, start, end, branchId, period);

  const reviewerIds = [...new Set(perfReviewsAgg.map((r) => r.reviewedById).filter((id): id is string => !!id))];
  const reviewerUsers =
    reviewerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, role: true, employee: { select: { id: true } } },
        })
      : [];
  const managerEmployeeIdByUserId = new Map<string, string | null>(
    reviewerUsers.map((u) => [u.id, u.employee?.id ?? null])
  );
  const reviewerRoleByUserId = new Map<string, ReturnType<typeof normalizeUserRole>>(
    reviewerUsers.map((u) => [u.id, normalizeUserRole(u.role)])
  );

  const attendanceRows: Record<
    string,
    { expectedWeekdays: number | null | undefined; absenceDays: number | null | undefined }
  > = {};
  for (const row of attendance.rows ?? []) {
    attendanceRows[row.employeeId] = {
      expectedWeekdays: row.expectedWeekdays,
      absenceDays: row.absenceDays,
    };
  }

  const managersForRating = managers.map((m) => ({
    id: m.id,
    name: m.name,
    branchId: m.branchId,
    branchName: m.branch.name,
    directReportIds: m.directReports.map((dr) => dr.id),
    userId: m.userId,
  }));

  const periodKey = period === 'day' || period === 'week' || period === 'month' ? period : 'month';
  const managerRatingReport = buildManagerRatingReport({
    period: periodKey,
    managers: managersForRating,
    perfReviews: perfReviewsAgg,
    formSubmissions: managementFormsAgg,
    managerEmployeeIdByUserId,
    reviewerRoleByUserId: reviewerRoleByUserId,
    attendanceRows,
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  const alertEmployeeIds = [
    ...new Set(
      ownerTimeClockAlerts
        .map((n) => {
          try {
            const data = n.dataJson ? (JSON.parse(n.dataJson) as Record<string, unknown>) : {};
            const maybeId = data.employeeId;
            return typeof maybeId === 'string' && maybeId.length > 0 ? maybeId : null;
          } catch {
            return null;
          }
        })
        .filter((id): id is string => !!id)
    ),
  ];
  const alertEmployeesById = new Map(
    (
      alertEmployeeIds.length > 0
        ? await prisma.employee.findMany({
            where: { id: { in: alertEmployeeIds } },
            select: { id: true, name: true, branch: { select: { name: true } } },
          })
        : []
    ).map((e) => [e.id, e] as const)
  );
  const ownerTimeClockAlertRows = ownerTimeClockAlerts.map((n) => {
    let data: Record<string, unknown> = {};
    try {
      data = n.dataJson ? (JSON.parse(n.dataJson) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
    const rawEmployeeId = data.employeeId;
    const employeeId = typeof rawEmployeeId === 'string' ? rawEmployeeId : '';
    const resolvedEmployee = employeeId ? alertEmployeesById.get(employeeId) : null;
    const employeeNameFromData = data.employeeName;
    const branchNameFromData = data.branchName;
    return {
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      employeeName:
        (typeof employeeNameFromData === 'string' && employeeNameFromData.trim().length > 0
          ? employeeNameFromData
          : resolvedEmployee?.name) ?? '—',
      branchName:
        (typeof branchNameFromData === 'string' && branchNameFromData.trim().length > 0
          ? branchNameFromData
          : resolvedEmployee?.branch.name) ?? '—',
      type: String(data.type ?? n.category),
    };
  });

  const advancesRequested = advances.length;
  const advancesApproved = advances.filter((a) => a.status === 'approved').length;
  const advancesDenied = advances.filter((a) => a.status === 'denied').length;
  const advancesPending = advances.filter((a) => a.status === 'pending').length;
  const advanceAmounts = {
    requestedAmount: advances.reduce((s, a) => s + a.amount, 0),
    approvedAmount: advances.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0),
    deniedAmount: advances.filter((a) => a.status === 'denied').reduce((s, a) => s + a.amount, 0),
    pendingAmount: advances.filter((a) => a.status === 'pending').reduce((s, a) => s + a.amount, 0),
  };

  const qcTotal = submissions.length;
  const qcApproved = submissions.filter((s) => s.status === 'approved').length;
  const qcDenied = submissions.filter((s) => s.status === 'denied').length;
  const qcPending = submissions.filter((s) => s.status === 'pending').length;
  const lateSubmissions = submissions.filter((s) => s.isLate);
  const avgRating =
    submissions.filter((s) => s.rating != null).length > 0
      ? submissions
          .filter((s) => s.rating != null)
          .reduce((sum, s) => sum + (s.rating ?? 0), 0) /
        submissions.filter((s) => s.rating != null).length
      : null;

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of submissions) {
    if (s.rating != null && s.rating >= 1 && s.rating <= 5) {
      ratingDistribution[s.rating]++;
    }
  }

  const qcTrend = getQcTrend(submissions, start, end, period);
  const qcByChecklist = getQcByChecklist(submissions);
  const formsTotal = formSubmissions.length;
  const formsFiled = formSubmissions.filter((s) => s.status === 'submitted' || s.status === 'pending').length;
  const formsApproved = formSubmissions.filter((s) => s.status === 'approved').length;
  const formsDenied = formSubmissions.filter((s) => s.status === 'denied').length;
  const formsAverageRating =
    formSubmissions.filter((s) => s.rating != null).length > 0
      ? formSubmissions.filter((s) => s.rating != null).reduce((sum, s) => sum + (s.rating ?? 0), 0) /
        formSubmissions.filter((s) => s.rating != null).length
      : null;
  const formsByTemplate = Object.values(
    formSubmissions.reduce((acc, s) => {
      const key = s.templateId;
      if (!acc[key]) {
        acc[key] = {
          templateId: s.templateId,
          title: s.template.title,
          category: s.template.category,
          total: 0,
          filed: 0,
          approved: 0,
          denied: 0,
        };
      }
      acc[key].total += 1;
      if (s.status === 'approved') acc[key].approved += 1;
      else if (s.status === 'denied') acc[key].denied += 1;
      else acc[key].filed += 1;
      return acc;
    }, {} as Record<string, { templateId: string; title: string; category: string; total: number; filed: number; approved: number; denied: number }>)
  ).sort((a, b) => b.total - a.total);
  const formsByBranch = formSubmissions.reduce((acc, s) => {
    acc[s.branchId] = (acc[s.branchId] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const formsByCategory = formSubmissions.reduce((acc, s) => {
    const key = s.template?.category ?? 'other';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const formsTrend = getFormsTrend(formSubmissions, start, end);
  const qcFormScoresByBranch = formSubmissions.reduce(
    (acc, submission) => {
      if (submission.template.category !== 'qc') return acc;
      let answers: Record<string, string> = {};
      try {
        answers = JSON.parse(submission.answersJson) as Record<string, string>;
      } catch {
        return acc;
      }
      let templateFields: ReturnType<typeof parseTemplateFields> = [];
      try {
        templateFields = parseTemplateFields(submission.template.fieldsJson);
      } catch {
        templateFields = [];
      }
      const profile = resolveQcScoringProfileForSubmission({
        title: submission.template.title,
        fields: templateFields,
        answers,
      });
      if (!isQcScoreableFormAnswers(answers, profile)) return acc;
      const score = buildQcScoreReport(answers, {
        branchName: submission.branch.name,
        qcOfficer: submission.employee.name,
        templateTitle: submission.template.title,
        templateFields,
      }).finalScore;
      if (!acc[submission.branchId]) acc[submission.branchId] = { sum: 0, count: 0 };
      acc[submission.branchId].sum += score;
      acc[submission.branchId].count += 1;
      return acc;
    },
    {} as Record<string, { sum: number; count: number }>
  );
  const branchOverviewWithScores = branchOverview.map((row) => {
    const formScores = qcFormScoresByBranch[row.id];
    const qcFormAvgScore = formScores && formScores.count > 0 ? Math.round(formScores.sum / formScores.count) : null;
    const approvalRate = row.qcTotal > 0 ? Math.round((row.qcApproved / row.qcTotal) * 100) : 0;
    const combinedEvaluationScore =
      qcFormAvgScore == null ? approvalRate : Math.round((approvalRate + qcFormAvgScore) / 2);
    return {
      ...row,
      qcFormAvgScore,
      qcRate: combinedEvaluationScore,
    };
  });
  const qcLogs = submissions
    .slice()
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 200)
    .map((s) => ({
      id: s.id,
      status: s.status,
      rating: s.rating,
      isLate: s.isLate,
      submittedAt: s.submittedAt,
      checklistName: s.assignment?.checklist?.name ?? '—',
      employee: { name: s.employee?.name ?? '—' },
      branch: { name: s.employee?.branch?.name ?? '—' },
      photos: s.photos.map((p) => ({ id: p.id, filePath: p.filePath })),
    }));

  const managerReports = managers.map((m) => {
    const reportIds = new Set(m.directReports.map((r) => r.id));
    const qcRows = submissions.filter((s) => reportIds.has(s.employeeId));
    const formRows = formSubmissions.filter((s) => reportIds.has(s.employeeId));
    const advanceRows = advances.filter((a) => reportIds.has(a.employeeId));
    const leaveRows = leaveRequestsRaw.filter((l) => reportIds.has(l.employeeId));

    const countStatuses = <T extends { status: string }>(rows: T[]) => ({
      total: rows.length,
      approved: rows.filter((r) => r.status === 'approved').length,
      denied: rows.filter((r) => r.status === 'denied').length,
      pending: rows.filter((r) => r.status === 'pending').length,
    });

    const qc = countStatuses(qcRows);
    const forms = {
      total: formRows.length,
      filed: formRows.filter((s) => s.status === 'submitted' || s.status === 'pending').length,
      approved: formRows.filter((s) => s.status === 'approved').length,
      denied: formRows.filter((s) => s.status === 'denied').length,
      pending: 0,
    };
    const advancesByManager = countStatuses(advanceRows);
    const leave = countStatuses(leaveRows);
    const overall = {
      total: qc.total + forms.total + advancesByManager.total + leave.total,
      approved: qc.approved + forms.approved + advancesByManager.approved + leave.approved,
      denied: qc.denied + forms.denied + advancesByManager.denied + leave.denied,
      pending: qc.pending + advancesByManager.pending + leave.pending,
    };

    return {
      managerId: m.id,
      managerName: m.name,
      branchId: m.branchId,
      branchName: m.branch.name,
      teamSize: m.directReports.length,
      qc,
      forms,
      advances: advancesByManager,
      leave,
      overall,
    };
  });

  const weekKeysPeriod = weekStartKeysBetweenRange(start, end, DEFAULT_APP_TIMEZONE);
  const monthKeysForRef = weekStartKeysOverlappingMonth(refDate, DEFAULT_APP_TIMEZONE);

  const [ratingsForPeriod, ratingsForMonth] = await Promise.all([
    weekKeysPeriod.length
      ? prisma.weeklyRating.findMany({
          where: { weekStartKey: { in: weekKeysPeriod }, ...(branchId ? { branchId } : {}) },
          select: {
            branchId: true,
            score: true,
            targetEmployeeId: true,
            target: { select: { id: true, name: true, joinDate: true } },
          },
        })
      : Promise.resolve([]),
    monthKeysForRef.length
      ? prisma.weeklyRating.findMany({
          where: { weekStartKey: { in: monthKeysForRef }, ...(branchId ? { branchId } : {}) },
          select: {
            branchId: true,
            score: true,
            targetEmployeeId: true,
            target: { select: { id: true, name: true, joinDate: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  type AggRow = {
    branchId: string;
    employeeId: string;
    name: string;
    sum: number;
    count: number;
    join: Date | null;
  };

  function aggregateWeeklyRatings(
    rows: {
      branchId: string;
      score: number;
      targetEmployeeId: string;
      target: { id: string; name: string; joinDate: Date | null };
    }[]
  ): AggRow[] {
    const map = new Map<string, AggRow>();
    for (const r of rows) {
      const k = `${r.branchId}:${r.targetEmployeeId}`;
      const cur =
        map.get(k) ??
        ({
          branchId: r.branchId,
          employeeId: r.targetEmployeeId,
          name: r.target.name,
          sum: 0,
          count: 0,
          join: r.target.joinDate,
        } as AggRow);
      cur.sum += r.score;
      cur.count += 1;
      map.set(k, cur);
    }
    return [...map.values()];
  }

  function sortAggRows(rows: AggRow[]): AggRow[] {
    return [...rows].sort((a, b) => {
      const avA = a.count ? a.sum / a.count : 0;
      const avB = b.count ? b.sum / b.count : 0;
      if (avB !== avA) return avB - avA;
      if (b.count !== a.count) return b.count - a.count;
      const ja = a.join ? new Date(a.join).getTime() : 0;
      const jb = b.join ? new Date(b.join).getTime() : 0;
      if (ja !== jb) return ja - jb;
      return a.name.localeCompare(b.name);
    });
  }

  const periodAgg = aggregateWeeklyRatings(ratingsForPeriod);
  const periodByBranch = branchesOrdered.map((b) => {
    const rows = sortAggRows(periodAgg.filter((x) => x.branchId === b.id)).slice(0, 20);
    return {
      branchId: b.id,
      branchName: b.name,
      rows: rows.map((r) => ({
        employeeName: r.name,
        avgScore: r.count ? Math.round((r.sum / r.count) * 10) / 10 : 0,
        count: r.count,
      })),
    };
  });

  const monthAgg = aggregateWeeklyRatings(ratingsForMonth);
  const monthByBranch = branchesOrdered.map((b) => {
    const sorted = sortAggRows(monthAgg.filter((x) => x.branchId === b.id));
    const top = sorted[0];
    return {
      branchId: b.id,
      branchName: b.name,
      employeeOfTheMonth: top
        ? {
            employeeName: top.name,
            avgScore: top.count ? Math.round((top.sum / top.count) * 10) / 10 : 0,
            count: top.count,
          }
        : null,
      leaderboard: sorted.slice(0, 20).map((r) => ({
        employeeName: r.name,
        avgScore: r.count ? Math.round((r.sum / r.count) * 10) / 10 : 0,
        count: r.count,
      })),
    };
  });

  const branchNameById = new Map(branchesOrdered.map((b) => [b.id, b.name]));
  const attendanceByBranchName = (attendance.rows ?? []).reduce(
    (acc, row) => {
      if (!acc[row.branchName]) acc[row.branchName] = { expected: 0, absence: 0 };
      acc[row.branchName].expected += row.expectedWeekdays ?? 0;
      acc[row.branchName].absence += row.absenceDays ?? 0;
      return acc;
    },
    {} as Record<string, { expected: number; absence: number }>
  );
  const weeklyRatingAvgByBranch = ratingsForPeriod.reduce(
    (acc, r) => {
      if (!acc[r.branchId]) acc[r.branchId] = { sum: 0, count: 0 };
      acc[r.branchId].sum += r.score;
      acc[r.branchId].count += 1;
      return acc;
    },
    {} as Record<string, { sum: number; count: number }>
  );
  const alertCountByBranch = timeClockAlertsByBranch.reduce(
    (acc, row) => {
      acc[row.branchId] = row._count._all;
      return acc;
    },
    {} as Record<string, number>
  );
  const punctualityByBranch = submissions.reduce(
    (acc, s) => {
      if (!acc[s.branchId]) acc[s.branchId] = { total: 0, late: 0 };
      acc[s.branchId].total += 1;
      if (s.isLate) acc[s.branchId].late += 1;
      return acc;
    },
    {} as Record<string, { total: number; late: number }>
  );

  const branchOverviewWithOwnerScore = branchOverviewWithScores.map((row) => {
    const branchName = branchNameById.get(row.id) ?? row.name;
    const attendanceAgg = attendanceByBranchName[branchName];
    const attendanceScore =
      attendanceAgg && attendanceAgg.expected > 0
        ? Math.max(0, Math.min(100, Math.round((1 - attendanceAgg.absence / attendanceAgg.expected) * 100)))
        : 70;

    const weeklyAgg = weeklyRatingAvgByBranch[row.id];
    const weeklyRatingScore =
      weeklyAgg && weeklyAgg.count > 0 ? Math.round(weeklyAgg.sum / weeklyAgg.count) : 70;

    const qcEvaluationScore = row.qcRate ?? 70;
    const alertCount = alertCountByBranch[row.id] ?? 0;
    const timeClockAlertsScore = Math.max(0, 100 - alertCount * 10);

    const punctualityAgg = punctualityByBranch[row.id];
    const punctualityScore =
      punctualityAgg && punctualityAgg.total > 0
        ? Math.max(0, Math.min(100, Math.round((1 - punctualityAgg.late / punctualityAgg.total) * 100)))
        : 70;

    const branchScore = Math.round(
      attendanceScore * 0.3 +
        weeklyRatingScore * 0.2 +
        qcEvaluationScore * 0.3 +
        timeClockAlertsScore * 0.1 +
        punctualityScore * 0.1
    );

    return {
      ...row,
      branchScore,
      branchScoreComponents: {
        attendanceScore,
        weeklyRatingScore,
        qcEvaluationScore,
        timeClockAlertsScore,
        punctualityScore,
        alertCount,
      },
    };
  });

  return Response.json({
    period,
    month: monthParam || null,
    salaryMonth: salaryRows.periodMonth,
    branchId: branchId || null,
    start: start.toISOString(),
    end: end.toISOString(),
    hr: {
      headcountByBranch,
      totalHeadcount: employees.length,
      newHires,
      headcountOverTime,
      attendance,
      timeClockAlerts: ownerTimeClockAlertRows,
      leave: leaveData,
      advances: {
        requested: advancesRequested,
        approved: advancesApproved,
        denied: advancesDenied,
        pending: advancesPending,
        ...advanceAmounts,
      },
      advancesList: advances,
    },
    qc: {
      total: qcTotal,
      approved: qcApproved,
      denied: qcDenied,
      pending: qcPending,
      averageRating: avgRating,
      lateCount: lateSubmissions.length,
      lateSubmissionsList: lateSubmissions,
      logs: qcLogs,
      ratingDistribution,
      trend: qcTrend,
      byChecklist: qcByChecklist,
      byBranch: submissions.reduce(
        (acc, s) => {
          const id = s.branchId;
          const formScores = qcFormScoresByBranch[id];
          const formAvg = formScores && formScores.count > 0 ? Math.round(formScores.sum / formScores.count) : null;
          const nextTotal = (acc[id]?.total ?? 0) + 1;
          const nextApproved = (acc[id]?.approved ?? 0) + (s.status === 'approved' ? 1 : 0);
          const approvalRate = nextTotal > 0 ? Math.round((nextApproved / nextTotal) * 100) : 0;
          acc[id] = {
            total: nextTotal,
            approved: nextApproved,
            late: (acc[id]?.late ?? 0) + (s.isLate ? 1 : 0),
            qcFormAvgScore: formAvg,
            evaluationScore: formAvg == null ? approvalRate : Math.round((approvalRate + formAvg) / 2),
          };
          return acc;
        },
        {} as Record<string, { total: number; approved: number; late: number; qcFormAvgScore: number | null; evaluationScore: number }>
      ),
    },
    salary: salaryRows,
    branchOverview: branchOverviewWithOwnerScore,
    cashReport,
    forms: {
      total: formsTotal,
      filed: formsFiled,
      approved: formsApproved,
      denied: formsDenied,
      averageRating: formsAverageRating,
      byTemplate: formsByTemplate,
      byBranch: formsByBranch,
      byCategory: formsByCategory,
      trend: formsTrend,
      recent: formSubmissions.slice(0, 20).map((s) => {
        let templateFields: ReturnType<typeof parseTemplateFields> = [];
        try {
          templateFields = parseTemplateFields(s.template.fieldsJson);
        } catch {
          templateFields = [];
        }
        return {
          id: s.id,
          status: s.status,
          submittedAt: s.submittedAt,
          employee: s.employee,
          branch: s.branch,
          template: {
            title: s.template.title,
            category: s.template.category,
            fields: templateFields,
          },
          answers: (() => {
            try {
              return JSON.parse(s.answersJson) as Record<string, string>;
            } catch {
              return {};
            }
          })(),
        };
      }),
    },
    managerReports,
    managerRatingReport,
    weeklyRatings: {
      periodLabel: format(start, 'yyyy-MM-dd') + ' – ' + format(end, 'yyyy-MM-dd'),
      monthLabel: format(refDate, 'yyyy-MM'),
      periodByBranch: periodByBranch,
      monthByBranch: monthByBranch,
    },
    activity: {
      transfers: {
        total: transfers.length,
        recent: transfers.slice(0, 20),
      },
      reviews: {
        total: reviews.length,
        averageRating:
          reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null,
        recent: reviews.slice(0, 20),
      },
      documents: {
        total: documents.length,
        recent: documents.slice(0, 20),
      },
    },
  });
}

function getFormsTrend(
  submissions: { submittedAt: Date; status: string }[],
  start: Date,
  end: Date
) {
  const byDay = new Map<string, { total: number; approved: number; filed: number }>();
  let d = new Date(start);
  while (d <= end) {
    byDay.set(format(d, 'yyyy-MM-dd'), { total: 0, approved: 0, filed: 0 });
    d.setDate(d.getDate() + 1);
  }
  for (const s of submissions) {
    const key = format(new Date(s.submittedAt), 'yyyy-MM-dd');
    const cur = byDay.get(key);
    if (cur) {
      cur.total++;
      if (s.status === 'approved') cur.approved++;
      if (s.status === 'submitted' || s.status === 'pending') cur.filed++;
    }
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

function getQcTrend(submissions: { submittedAt: Date; status: string }[], start: Date, end: Date, period: string) {
  const byDay = new Map<string, { total: number; approved: number }>();
  let d = new Date(start);
  while (d <= end) {
    byDay.set(format(d, 'yyyy-MM-dd'), { total: 0, approved: 0 });
    d.setDate(d.getDate() + 1);
  }
  for (const s of submissions) {
    const key = format(new Date(s.submittedAt), 'yyyy-MM-dd');
    const cur = byDay.get(key);
    if (cur) {
      cur.total++;
      if (s.status === 'approved') cur.approved++;
    }
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

function getQcByChecklist(
  submissions: { status: string; assignment: { checklist: { name: string } } }[]
) {
  const byChecklist = new Map<string, { total: number; approved: number }>();
  for (const s of submissions) {
    const name = s.assignment?.checklist?.name ?? 'Unknown';
    const cur = byChecklist.get(name) ?? { total: 0, approved: 0 };
    cur.total++;
    if (s.status === 'approved') cur.approved++;
    byChecklist.set(name, cur);
  }
  return Array.from(byChecklist.entries()).map(([name, v]) => ({
    name,
    total: v.total,
    approved: v.approved,
    rate: v.total ? Math.round((v.approved / v.total) * 100) : 0,
  }));
}

const PART_TIME_MIN_DAYS_MONTH = 15;

/** Scheduled workdays in app locales (Jordan): Sun (0) through Thu (4). Fri–Sat weekend. */
function isWorkdaySunThu(d: Date): boolean {
  const wd = d.getDay();
  return wd !== 5 && wd !== 6;
}

function formatYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Calendar days from start..end inclusive (date-normalized). */
function eachCalendarDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function effectiveEmployedStart(periodStart: Date, joinDate: Date | null): Date {
  const ps = startOfDay(periodStart);
  if (!joinDate) return ps;
  const jd = startOfDay(joinDate);
  return jd.getTime() > ps.getTime() ? jd : ps;
}

/** Sun–Thu dates in [periodStart, periodEnd] on or after the employee’s hire date (date-only bounds). */
function workdayKeysForEmployee(joinDate: Date | null, periodStart: Date, periodEnd: Date): Set<string> {
  const eff = effectiveEmployedStart(periodStart, joinDate);
  const last = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  if (eff.getTime() > last.getTime()) return new Set();

  const set = new Set<string>();
  for (const d of eachCalendarDay(eff, last)) {
    if (isWorkdaySunThu(d)) set.add(formatYmd(d));
  }
  return set;
}

async function getAttendanceReport(
  employees: {
    id: string;
    branchId: string;
    name: string;
    joinDate: Date | null;
    employmentType: string;
    branch: { name: string };
  }[],
  start: Date,
  end: Date,
  branchId: string,
  period: string
) {
  const [entries, leaves] = await Promise.all([
    prisma.timeClockEntry.findMany({
      where: {
        clockInAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      select: { employeeId: true, clockInAt: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: 'approved',
        startDate: { lte: end },
        endDate: { gte: start },
        ...(branchId ? { employee: { branchId } } : {}),
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);

  const presentAllDays = new Map<string, Set<string>>();
  for (const e of entries) {
    const day = formatYmd(new Date(e.clockInAt));
    if (!presentAllDays.has(e.employeeId)) presentAllDays.set(e.employeeId, new Set());
    presentAllDays.get(e.employeeId)!.add(day);
  }

  const leaveWeekdays = new Map<string, Set<string>>();
  for (const l of leaves) {
    const ovStart = l.startDate > start ? new Date(l.startDate) : new Date(start);
    const ovEnd = l.endDate < end ? new Date(l.endDate) : new Date(end);
    for (const d of eachCalendarDay(ovStart, ovEnd)) {
      if (!isWorkdaySunThu(d)) continue;
      const key = formatYmd(d);
      if (!leaveWeekdays.has(l.employeeId)) leaveWeekdays.set(l.employeeId, new Set());
      leaveWeekdays.get(l.employeeId)!.add(key);
    }
  }

  const isMonthView = period === 'month';

  const rows = employees.map((emp) => {
    const presentAll = presentAllDays.get(emp.id) ?? new Set<string>();
    const leaveSet = leaveWeekdays.get(emp.id) ?? new Set<string>();
    const empWorkdays = workdayKeysForEmployee(emp.joinDate, start, end);
    let presentWeekdays = 0;
    for (const day of presentAll) {
      if (empWorkdays.has(day)) presentWeekdays++;
    }
    let expectedWeekdays = 0;
    for (const wk of empWorkdays) {
      if (!leaveSet.has(wk)) expectedWeekdays++;
    }
    const absenceDays = Math.max(0, expectedWeekdays - presentWeekdays);
    const distinctClockInDays = presentAll.size;
    const type = emp.employmentType === 'part_time' ? 'part_time' : 'full_time';
    const partTimeMinimumMet =
      isMonthView && type === 'part_time' ? distinctClockInDays >= PART_TIME_MIN_DAYS_MONTH : null;

    return {
      employeeId: emp.id,
      name: emp.name,
      branchName: emp.branch.name,
      employmentType: type,
      presentWeekdays,
      absenceDays,
      distinctClockInDays,
      leaveWeekdaysCounted: leaveSet.size,
      expectedWeekdays,
      partTimeMinimumMet,
      partTimeMinimumRequired: type === 'part_time' && isMonthView ? PART_TIME_MIN_DAYS_MONTH : null,
    };
  });

  rows.sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));

  return {
    period,
    isMonthView,
    partTimeMinimumDays: PART_TIME_MIN_DAYS_MONTH,
    rows,
  };
}

async function getLeaveReport(start: Date, end: Date, branchId: string) {
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      startDate: { lte: end },
      endDate: { gte: start },
      ...(branchId ? { employee: { branchId } } : {}),
    },
    include: { employee: { include: { branch: true } } },
  });

  const byBranch: Record<string, { pending: number; approved: number; denied: number; daysApproved: number }> = {};
  let totalPending = 0;
  let totalApproved = 0;
  let totalDenied = 0;
  let totalDaysApproved = 0;

  for (const lr of leaveRequests) {
    const bid = lr.employee.branchId;
    if (!byBranch[bid]) byBranch[bid] = { pending: 0, approved: 0, denied: 0, daysApproved: 0 };
    if (lr.status === 'pending') {
      byBranch[bid].pending++;
      totalPending++;
    } else if (lr.status === 'approved') {
      byBranch[bid].approved++;
      totalApproved++;
      const overlapStart = lr.startDate > start ? new Date(lr.startDate) : start;
      const overlapEnd = lr.endDate < end ? new Date(lr.endDate) : end;
      const days = overlapEnd >= overlapStart
        ? Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 0;
      byBranch[bid].daysApproved += days;
      totalDaysApproved += days;
    } else {
      byBranch[bid].denied++;
      totalDenied++;
    }
  }

  const logs = leaveRequests
    .slice()
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 200)
    .map((lr) => ({
      id: lr.id,
      type: lr.type,
      status: lr.status,
      startDate: lr.startDate,
      endDate: lr.endDate,
      createdAt: lr.createdAt,
      employee: { name: lr.employee.name },
      branch: { name: lr.employee.branch.name },
    }));

  return { byBranch, totalPending, totalApproved, totalDenied, totalDaysApproved, logs };
}

async function getNewHires(start: Date, end: Date, branchId: string) {
  const oneMonthAgo = subMonths(end, 1);
  const employees = await prisma.employee.findMany({
    where: {
      joinDate: { gte: oneMonthAgo, lte: end },
      ...(branchId ? { branchId } : {}),
    },
    include: { branch: true },
  });
  return employees;
}

async function getHeadcountOverTime(branchId: string) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  const counts = await Promise.all(
    months.map((d) => {
      const endOfMonthDate = endOfMonth(d);
      return prisma.employee.count({
        where: {
          joinDate: { lte: endOfMonthDate },
          status: { not: 'terminated' },
          ...(branchId ? { branchId } : {}),
        },
      }).then((count) => ({ month: format(d, 'yyyy-MM'), count }));
    })
  );
  return counts;
}

async function getBranchOverview(
  branchId: string,
  start: Date,
  end: Date
) {
  const branches = await prisma.branch.findMany({
    where: branchId ? { id: branchId } : undefined,
    include: {
      employees: { where: { status: { not: 'terminated' } }, select: { id: true } },
      qcSubmissions: {
        where: { submittedAt: { gte: start, lte: end } },
        select: { status: true },
      },
    },
  });

  const advancesByBranch = await prisma.advance.groupBy({
    by: ['employeeId'],
    where: {
      requestedAt: { gte: start, lte: end },
      status: 'approved',
      ...(branchId ? { employee: { branchId } } : {}),
    },
    _sum: { amount: true },
  });

  const salaryByBranch = await prisma.salaryCopy.groupBy({
    by: ['branchId'],
    where: {
      periodMonth: format(start, 'yyyy-MM'),
      ...(branchId ? { branchId } : {}),
    },
    _sum: { amount: true },
  });

  const empIds = advancesByBranch.map((a) => a.employeeId);
  const empBranches =
    empIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: empIds } },
          select: { id: true, branchId: true },
        })
      : [];
  const branchIdByEmployeeId = new Map(empBranches.map((e) => [e.id, e.branchId] as const));
  const advMap = new Map<string, number>();
  for (const a of advancesByBranch) {
    const bid = branchIdByEmployeeId.get(a.employeeId);
    if (bid) advMap.set(bid, (advMap.get(bid) ?? 0) + (a._sum.amount ?? 0));
  }

  return branches.map((b) => {
    const subs = b.qcSubmissions;
    const total = subs.length;
    const approved = subs.filter((s) => s.status === 'approved').length;
    return {
      id: b.id,
      name: b.name,
      headcount: b.employees.length,
      advancesSum: advMap.get(b.id) ?? 0,
      qcTotal: total,
      qcApproved: approved,
      qcRate: total ? Math.round((approved / total) * 100) : 0,
      totalSalary: salaryByBranch.find((s) => s.branchId === b.id)?._sum?.amount ?? 0,
    };
  });
}

