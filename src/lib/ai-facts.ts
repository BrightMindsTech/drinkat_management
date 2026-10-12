import type { PrismaClient } from '@prisma/client';
import { ammanPeriodKey } from '@/lib/inspection-generate';
import { monthPeriodKey } from '@/lib/kpi-compute';

export type AiActor = {
  role: string;
  employeeId?: string | null;
  branchId?: string | null;
};

function scopeBranch(actor: AiActor): string | undefined {
  if (actor.role === 'owner' || actor.role === 'qc') return undefined;
  return actor.branchId ?? '__none__';
}

/** Deterministic operational facts only. No invented numbers. No emails/salary/phone. */
export async function gatherDailyBriefFacts(prisma: PrismaClient, actor: AiActor) {
  const branchId = scopeBranch(actor);
  const day = ammanPeriodKey();
  const month = monthPeriodKey();
  const branchWhere = branchId ? { branchId } : {};

  const [
    overdueInspections,
    dueToday,
    completedToday,
    pendingCorrections,
    criticalOpen,
    recurringFailures,
    branches,
  ] = await Promise.all([
    prisma.inspectionTask.count({ where: { ...branchWhere, status: 'overdue' } }),
    prisma.inspectionTask.count({ where: { ...branchWhere, periodKey: day, status: { in: ['due', 'scheduled', 'in_progress'] } } }),
    prisma.inspectionTask.count({ where: { ...branchWhere, periodKey: day, status: 'completed' } }),
    prisma.issue.count({
      where: { ...branchWhere, status: { in: ['open', 'acknowledged', 'in_progress', 'reopened', 'fixed'] } },
    }),
    prisma.issue.count({
      where: { ...branchWhere, severity: 'critical', status: { notIn: ['closed', 'verified'] } },
    }),
    prisma.issue.count({ where: { ...branchWhere, reopenCount: { gt: 0 } } }),
    prisma.branch.findMany({
      where: branchId ? { id: branchId } : {},
      select: { id: true, name: true },
    }),
  ]);

  const branchPerformance = [];
  for (const b of branches) {
    const [overdue, openIssues] = await Promise.all([
      prisma.inspectionTask.count({ where: { branchId: b.id, status: 'overdue' } }),
      prisma.issue.count({
        where: { branchId: b.id, status: { in: ['open', 'acknowledged', 'in_progress', 'reopened', 'fixed'] } },
      }),
    ]);
    branchPerformance.push({ branch: b.name, overdueInspections: overdue, pendingCorrections: openIssues });
  }

  return {
    asOfDay: day,
    asOfMonth: month,
    overdueInspections,
    inspectionsStillOpenToday: dueToday,
    inspectionsCompletedToday: completedToday,
    pendingCorrections,
    criticalIssuesOpen: criticalOpen,
    recurringFailures,
    branchPerformance,
    source: 'd1_deterministic_counts',
  };
}

export async function gatherCoachingEvidence(prisma: PrismaClient, actor: AiActor) {
  if (!actor.employeeId) {
    return { subjectRole: actor.role, evidence: [], note: 'No employee profile; no individual evidence.' };
  }
  const issues = await prisma.issue.findMany({
    where: {
      OR: [{ assigneeEmployeeId: actor.employeeId }, { inspectionTask: { assigneeEmployeeId: actor.employeeId } }],
      status: { in: ['closed', 'verified', 'fixed', 'reopened'] },
    },
    select: {
      questionLabel: true,
      severity: true,
      status: true,
      reopenCount: true,
      responsibilityApproved: true,
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  });
  const tasks = await prisma.inspectionTask.findMany({
    where: { assigneeEmployeeId: actor.employeeId },
    select: { status: true, periodKey: true },
    take: 40,
    orderBy: { dueAt: 'desc' },
  });
  return {
    subjectRole: actor.role,
    verifiedIssues: issues,
    recentTaskStatuses: tasks,
    kpiNote: 'KPI scores are never modified by AI. Shadow scores are not sent as official ratings.',
  };
}

export function sanitizeAiInput(input: Record<string, unknown>): Record<string, unknown> {
  const blocked = ['email', 'password', 'salary', 'phone', 'contact', 'passwordHash'];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (blocked.includes(k)) continue;
    out[k] = v;
  }
  return out;
}
