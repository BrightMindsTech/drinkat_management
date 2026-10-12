import type { PrismaClient } from '@prisma/client';
import { isPhotoCheckSchedulerEnabled } from '@/lib/photo-generate';
import { notifyUsers } from '@/lib/user-notify';
import { BRANCH_PHOTO_CLAIMED } from '@/lib/photo-branch-claim';
import { isPhotoWindowOpenNow } from '@/lib/photo-time';

/** While a photo window is open, keep nudging until the employee submits. */
export const ACTIVE_PHOTO_REMINDER_MINUTES = 30;

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
    take: 800,
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

  let sent = 0;
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
    if (!shouldSendActivePhotoReminder(task.lastRemindedAt, now)) {
      skipped += 1;
      continue;
    }

    const overdue = task.status === 'overdue' || task.dueAt < now;
    const kind = overdue ? 'overdue' : 'due';
    const titleEn = overdue
      ? `${task.type.titleEn} is overdue. Take your photo now.`
      : `${task.type.titleEn} check is due. Take your photo.`;
    const titleAr = overdue
      ? `${task.type.titleAr} متأخر. يرجى التقاط الصورة الآن.`
      : `حان موعد ${task.type.titleAr}. يرجى التقاط الصورة.`;
    const url = `/dashboard/photo?task=${encodeURIComponent(task.id)}`;
    await notifyUsers(prisma, [task.assignee.userId], {
      category: overdue ? 'photo_check_overdue' : 'photo_check_due',
      title: titleEn,
      body: titleAr,
      dataJson: JSON.stringify({ type: overdue ? 'photo_check_overdue' : 'photo_check_due', taskId: task.id, url }),
      push: {
        title: titleEn,
        body: titleAr,
        data: { type: overdue ? 'photo_check_overdue' : 'photo_check_due', url, taskId: task.id },
      },
    });
    await prisma.photoCheckTask.update({
      where: { id: task.id },
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
