import type { PrismaClient } from '@prisma/client';
import { isInspectionSchedulerEnabled } from '@/lib/inspection-generate';
import { notifyUsers } from '@/lib/user-notify';

const REMIND_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const ESCALATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function sendInspectionTaskRemindersIfDue(prisma: PrismaClient) {
  if (!isInspectionSchedulerEnabled()) return { sent: 0 };
  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  const tasks = await prisma.inspectionTask.findMany({
    where: {
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
      dueAt: { lte: soon },
    },
    include: {
      assignee: { select: { userId: true, name: true } },
      templateVersion: { select: { title: true } },
    },
    take: 80,
  });

  let sent = 0;
  for (const task of tasks) {
    if (!task.assignee.userId) continue;
    if (task.lastRemindedAt && now.getTime() - task.lastRemindedAt.getTime() < REMIND_COOLDOWN_MS) {
      continue;
    }
    const overdue = task.status === 'overdue' || task.dueAt < now;
    await notifyUsers(prisma, [task.assignee.userId], {
      category: overdue ? 'inspection_overdue' : 'inspection_due',
      title: overdue ? 'Inspection overdue' : 'Inspection due',
      body: `${task.templateVersion.title} — ${task.assignee.name}`,
      push: {
        title: overdue ? 'Inspection overdue' : 'Inspection due',
        body: task.templateVersion.title,
        data: { type: overdue ? 'inspection_overdue' : 'inspection_due', url: '/dashboard/tasks', taskId: task.id },
      },
    });
    await prisma.inspectionTask.update({
      where: { id: task.id },
      data: { lastRemindedAt: now },
    });
    sent += 1;
  }
  return { sent };
}

function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function sendIssueEscalationsIfDue(prisma: PrismaClient) {
  if (!isInspectionSchedulerEnabled()) return { sent: 0 };
  const rules = await prisma.escalationRule.findMany({ where: { active: true } });
  if (rules.length === 0) return { sent: 0 };
  const open = await prisma.issue.findMany({
    where: { status: { in: ['open', 'acknowledged', 'in_progress', 'reopened'] } },
    include: { branch: { select: { name: true } } },
    take: 100,
  });
  let sent = 0;
  const now = Date.now();
  for (const issue of open) {
    const rule = rules.find((r) => r.severity === issue.severity);
    if (!rule) continue;
    if (now - issue.createdAt.getTime() < rule.slaHours * 3600_000) continue;
    if (issue.lastEscalatedAt && now - issue.lastEscalatedAt.getTime() < ESCALATE_COOLDOWN_MS) continue;

    const roles = parseJsonArray(rule.notifyRolesJson);
    const extraIds = parseJsonArray(rule.notifyUserIdsJson);
    const roleUsers =
      roles.length > 0
        ? await prisma.user.findMany({ where: { role: { in: roles } }, select: { id: true } })
        : await prisma.user.findMany({ where: { role: { in: ['owner', 'qc'] } }, select: { id: true } });
    const ids = [...new Set([...roleUsers.map((u) => u.id), ...extraIds])];
    if (ids.length === 0) continue;
    await notifyUsers(prisma, ids, {
      category: 'issue_escalation',
      title: `Issue SLA: ${issue.severity}`,
      body: `${issue.questionLabel} at ${issue.branch?.name ?? 'branch'} still ${issue.status}. SLA hours are a configurable staging default, not an approved food-safety threshold.`,
      push: {
        title: 'Issue SLA reminder',
        body: issue.questionLabel,
        data: { type: 'issue_escalation', url: `/dashboard/issues/${issue.id}`, issueId: issue.id },
      },
    });
    await prisma.issue.update({
      where: { id: issue.id },
      data: { lastEscalatedAt: new Date() },
    });
    sent += 1;
  }
  return { sent };
}
