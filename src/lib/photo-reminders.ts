import type { PrismaClient } from '@prisma/client';
import { isPhotoCheckSchedulerEnabled } from '@/lib/photo-generate';
import { notifyUsers } from '@/lib/user-notify';
import { BRANCH_PHOTO_CLAIMED } from '@/lib/photo-branch-claim';
import { isPhotoWindowOpenNow } from '@/lib/photo-time';
import { formatAppTime } from '@/lib/format-datetime';

/** While a photo window is open, keep nudging until the employee submits. */
export const ACTIVE_PHOTO_REMINDER_MINUTES = 30;
/** Keep the OS notification until the next 30-minute tick. */
export const PHOTO_REMINDER_PUSH_TTL_SEC = 28 * 60;

export function isPhotoTaskActiveForReminder(
  task: { status: string; windowStartAt: Date; dueAt: Date },
  now: Date
): boolean {
  if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'excused') return false;
  if (!isPhotoWindowOpenNow(task, now)) return false;
  return (
    task.status === 'due' ||
    task.status === 'in_progress' ||
    task.status === 'overdue' ||
    task.status === 'scheduled'
  );
}

export function shouldSendActivePhotoReminder(
  lastRemindedAt: Date | null,
  now: Date,
  intervalMinutes = ACTIVE_PHOTO_REMINDER_MINUTES
): boolean {
  if (!lastRemindedAt) return true;
  return now.getTime() - lastRemindedAt.getTime() >= intervalMinutes * 60_000;
}

/** One push per person — latest lastRemindedAt across their open tasks. */
export function latestPhotoReminderAt(times: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const t of times) {
    if (!t) continue;
    if (!latest || t.getTime() > latest.getTime()) latest = t;
  }
  return latest;
}

function photoReminderCopy(
  tasks: Array<{
    id: string;
    status: string;
    dueAt: Date;
    type: { titleEn: string; titleAr: string };
  }>,
  now: Date
): { titleEn: string; titleAr: string; overdue: boolean; taskId: string } {
  const overdue = tasks.some((t) => t.status === 'overdue' || t.dueAt < now);
  const first = tasks[0]!;
  const clock = formatAppTime(now, 'en');
  const n = tasks.length;
  if (n === 1) {
    return {
      overdue,
      taskId: first.id,
      titleEn: overdue
        ? `${first.type.titleEn} is overdue. Take your photo now. (${clock})`
        : `${first.type.titleEn} check is due. Take your photo. (${clock})`,
      titleAr: overdue
        ? `${first.type.titleAr} متأخر. يرجى التقاط الصورة الآن. (${clock})`
        : `حان موعد ${first.type.titleAr}. يرجى التقاط الصورة. (${clock})`,
    };
  }
  return {
    overdue,
    taskId: first.id,
    titleEn: overdue
      ? `${n} photo checks are overdue. Take your photos now. (${clock})`
      : `${n} photo checks are due. Take your photos. (${clock})`,
    titleAr: overdue
      ? `${n} فحوص صور متأخرة. يرجى التقاط الصور الآن. (${clock})`
      : `${n} فحوص صور مستحقة. يرجى التقاط الصور. (${clock})`,
  };
}

export async function sendPhotoCheckRemindersIfDue(prisma: PrismaClient, now = new Date()) {
  if (!isPhotoCheckSchedulerEnabled()) return { sent: 0, skipped: 0 };

  const tasks = await prisma.photoCheckTask.findMany({
    where: {
      status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
    },
    include: {
      assignee: { select: { userId: true, name: true } },
      type: { select: { titleEn: true, titleAr: true } },
    },
    take: 2500,
  });

  const empIds = [...new Set(tasks.map((t) => t.assigneeEmployeeId))];
  const [onRows, typeRows] = empIds.length
    ? await Promise.all([
        prisma.photoCheckEmployeeSetting.findMany({
          where: { employeeId: { in: empIds }, required: true },
          select: { employeeId: true },
        }),
        prisma.photoCheckEmployeeType.findMany({
          where: { employeeId: { in: empIds }, assigned: true },
          select: { employeeId: true, typeId: true },
        }),
      ])
    : [[], []];
  const photoOn = new Set(onRows.map((r) => r.employeeId));
  // Same rule as employeeAssignedType: required + assigned type.
  const assigned = new Set(typeRows.map((r) => `${r.employeeId}:${r.typeId}`));
  const periodKeys = [...new Set(tasks.map((t) => t.periodKey))];
  const completed = periodKeys.length
    ? await prisma.photoCheckTask.findMany({
        where: { periodKey: { in: periodKeys }, status: 'completed' },
        select: { branchId: true, scheduleId: true, periodKey: true },
      })
    : [];
  const claimed = new Set(completed.map((c) => `${c.branchId}:${c.scheduleId}:${c.periodKey}`));
  const healed = new Set<string>();
  for (const c of completed) {
    const key = `${c.branchId}:${c.scheduleId}:${c.periodKey}`;
    if (healed.has(key)) continue;
    healed.add(key);
    await prisma.photoCheckTask.updateMany({
      where: {
        branchId: c.branchId,
        scheduleId: c.scheduleId,
        periodKey: c.periodKey,
        status: { in: ['scheduled', 'due', 'in_progress', 'overdue'] },
      },
      data: { status: 'cancelled', excusedReason: BRANCH_PHOTO_CLAIMED },
    });
  }

  const byUser = new Map<string, typeof tasks>();
  let skipped = 0;
  for (const task of tasks) {
    if (claimed.has(`${task.branchId}:${task.scheduleId}:${task.periodKey}`)) {
      skipped += 1;
      continue;
    }
    const stillAssigned =
      photoOn.has(task.assigneeEmployeeId) && assigned.has(`${task.assigneeEmployeeId}:${task.typeId}`);
    if (!stillAssigned || !task.assignee.userId) {
      skipped += 1;
      continue;
    }
    if (!isPhotoTaskActiveForReminder(task, now)) {
      skipped += 1;
      continue;
    }
    const userId = task.assignee.userId;
    const list = byUser.get(userId) ?? [];
    list.push(task);
    byUser.set(userId, list);
  }

  let sent = 0;
  for (const [userId, userTasks] of byUser) {
    const last = latestPhotoReminderAt(userTasks.map((t) => t.lastRemindedAt));
    if (!shouldSendActivePhotoReminder(last, now)) {
      skipped += userTasks.length;
      continue;
    }

    const copy = photoReminderCopy(userTasks, now);
    const taskId = copy.taskId;
    const url = `/dashboard/photo?task=${encodeURIComponent(taskId)}`;
    const kind = copy.overdue ? 'overdue' : 'due';
    const type = copy.overdue ? 'photo_check_overdue' : 'photo_check_due';
    await notifyUsers(prisma, [userId], {
      category: type,
      title: copy.titleEn,
      body: copy.titleAr,
      dataJson: JSON.stringify({ type, taskId, url, reminderAt: now.toISOString() }),
      push: {
        title: copy.titleEn,
        body: copy.titleAr,
        ttlSec: PHOTO_REMINDER_PUSH_TTL_SEC,
        topic: `pr${now.getTime().toString(36)}${userId.slice(0, 8)}`.slice(0, 32),
        data: { type, url, taskId, reminderAt: now.toISOString() },
      },
    });
    await prisma.photoCheckTask.updateMany({
      where: { id: { in: userTasks.map((t) => t.id) } },
      data: {
        lastRemindedAt: now,
        lastReminderKind: kind,
        reminderCount: { increment: 1 },
      },
    });
    sent += 1;
  }
  return { sent, skipped };
}
