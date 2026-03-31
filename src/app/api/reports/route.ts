import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export async function GET(req: NextRequest) {
  await requireOwner();
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

  const statusFilter = { status: { not: 'terminated' as const } };
  const [employees, advances, submissions, salaryRows, newHires, headcountOverTime, branchOverview, leaveData, formSubmissions, transfers, reviews, documents] = await Promise.all([
    prisma.employee.findMany({
      where: { ...branchFilter, ...statusFilter },
      select: { id: true, branchId: true, name: true, joinDate: true },
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
      },
    }),
    getSalaryDeductionRows(salaryMonthParam || undefined, branchId),
    getNewHires(start, end, branchId),
    getHeadcountOverTime(branchId),
    getBranchOverview(branchId, start, end),
    getLeaveReport(start, end, branchId),
    prisma.managementFormSubmission.findMany({
      where: {
        submittedAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        template: { select: { title: true, category: true } },
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
  ]);

  const headcountByBranch = employees.reduce((acc, e) => {
    acc[e.branchId] = (acc[e.branchId] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
  const formsApproved = formSubmissions.filter((s) => s.status === 'approved').length;
  const formsDenied = formSubmissions.filter((s) => s.status === 'denied').length;
  const formsPending = formSubmissions.filter((s) => s.status === 'pending').length;
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
          approved: 0,
          denied: 0,
          pending: 0,
        };
      }
      acc[key].total += 1;
      if (s.status === 'approved') acc[key].approved += 1;
      else if (s.status === 'denied') acc[key].denied += 1;
      else acc[key].pending += 1;
      return acc;
    }, {} as Record<string, { templateId: string; title: string; category: string; total: number; approved: number; denied: number; pending: number }>)
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
    }));

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
          acc[id] = {
            total: (acc[id]?.total ?? 0) + 1,
            approved: (acc[id]?.approved ?? 0) + (s.status === 'approved' ? 1 : 0),
            late: (acc[id]?.late ?? 0) + (s.isLate ? 1 : 0),
          };
          return acc;
        },
        {} as Record<string, { total: number; approved: number; late: number }>
      ),
    },
    salary: salaryRows,
    branchOverview,
    forms: {
      total: formsTotal,
      approved: formsApproved,
      denied: formsDenied,
      pending: formsPending,
      averageRating: formsAverageRating,
      byTemplate: formsByTemplate,
      byBranch: formsByBranch,
      byCategory: formsByCategory,
      trend: formsTrend,
      recent: formSubmissions.slice(0, 20),
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
  const result: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const endOfMonthDate = endOfMonth(d);
    const count = await prisma.employee.count({
      where: {
        joinDate: { lte: endOfMonthDate },
        status: { not: 'terminated' },
        ...(branchId ? { branchId } : {}),
      },
    });
    result.push({ month: format(d, 'yyyy-MM'), count });
  }
  return result;
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

  const advMap = new Map<string, number>();
  for (const a of advancesByBranch) {
    const emp = await prisma.employee.findUnique({ where: { id: a.employeeId }, select: { branchId: true } });
    if (emp) advMap.set(emp.branchId, (advMap.get(emp.branchId) ?? 0) + (a._sum.amount ?? 0));
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

async function getSalaryDeductionRows(salaryMonth: string | undefined, branchId: string) {
  const now = new Date();
  const periodMonth = salaryMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const salaryCopies = await prisma.salaryCopy.findMany({
    where: { periodMonth, ...(branchId ? { branchId } : {}) },
    include: { employee: { include: { branch: true } } },
  });

  const allApproved = await prisma.advance.findMany({
    where: { status: 'approved', ...(branchId ? { employee: { branchId } } : {}) },
    select: { employeeId: true, amount: true },
  });
  const deductionByEmployee = new Map<string, number>();
  for (const a of allApproved) {
    deductionByEmployee.set(a.employeeId, (deductionByEmployee.get(a.employeeId) ?? 0) + a.amount);
  }

  const rows = salaryCopies.map((sc) => {
    const deduction = deductionByEmployee.get(sc.employeeId) ?? 0;
    return {
      periodMonth: sc.periodMonth,
      employeeName: sc.employee.name,
      branchName: sc.employee.branch.name,
      salary: sc.amount,
      deduction,
      net: Math.max(0, sc.amount - deduction),
    };
  });
  const totals = rows.reduce(
    (acc, r) => ({ salary: acc.salary + r.salary, deduction: acc.deduction + r.deduction, net: acc.net + r.net }),
    { salary: 0, deduction: 0, net: 0 }
  );
  return { periodMonth, rows, totals };
}
