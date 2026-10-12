import type { PrismaClient } from '@prisma/client';
import { ammanCalendarDayKey } from '@/lib/format-datetime';
import {
  qcSubmitReminderSlotNow,
  qcSubmitReminderWatermarkKey,
  type QcSubmitReminderSlot,
} from '@/lib/qc-pending-submission';
import { notifyUser } from '@/lib/user-notify';

function reminderCopy(
  checklistName: string,
  slot: QcSubmitReminderSlot,
  repeatsDaily: boolean
): { title: string; body: string } {
  if (slot === 'deadline') {
    return {
      title: 'QC checklist due now',
      body: repeatsDaily
        ? `Submit "${checklistName}" before today's deadline.`
        : `Submit "${checklistName}" — due today.`,
    };
  }
  return {
    title: 'QC checklist reminder',
    body: repeatsDaily
      ? `You still need to submit "${checklistName}" today.`
      : `You still need to submit "${checklistName}".`,
  };
}

/** Push staff when they still owe a QC checklist submission (5-min cron: 9:00 Amman + deadline). */
export async function sendQcSubmitRemindersIfDue(prisma: PrismaClient): Promise<{
  checked: number;
  sent: number;
  skippedAlreadySent: number;
}> {
  const now = new Date();
  const todayKey = ammanCalendarDayKey(now);

  const assignments = await prisma.checklistAssignment.findMany({
    where: {
      employee: {
        userId: { not: null },
        status: { in: ['active', 'on_leave'] },
        role: { in: ['staff', 'qc'] },
      },
    },
    include: {
      checklist: { select: { name: true, repeatsDaily: true, deadlineTime: true } },
      employee: { select: { userId: true } },
      submissions: {
        select: { submittedAt: true },
        orderBy: { submittedAt: 'desc' },
        take: 8,
      },
    },
  });

  let sent = 0;
  let skippedAlreadySent = 0;

  for (const assignment of assignments) {
    const slot = qcSubmitReminderSlotNow(assignment, now);
    if (!slot) continue;

    const userId = assignment.employee.userId;
    if (!userId) continue;

    const watermarkKey = qcSubmitReminderWatermarkKey(assignment.id, todayKey, slot);
    const existing = await prisma.appCronWatermark.findUnique({ where: { key: watermarkKey } });
    if (existing) {
      skippedAlreadySent += 1;
      continue;
    }

    const href = `/dashboard/qc#qc-assignment-${assignment.id}`;
    const { title, body } = reminderCopy(assignment.checklist.name, slot, assignment.checklist.repeatsDaily);

    await notifyUser(prisma, userId, {
      category: 'staff_qc_submit',
      title,
      body,
      dataJson: JSON.stringify({
        type: 'staff_qc_submit',
        href,
        assignmentId: assignment.id,
        slot,
      }),
      push: {
        title,
        body,
        data: {
          type: 'staff_qc_submit',
          url: href,
          assignmentId: assignment.id,
        },
      },
    });

    await prisma.appCronWatermark.upsert({
      where: { key: watermarkKey },
      create: { key: watermarkKey, lastRunAt: now },
      update: { lastRunAt: now },
    });
    sent += 1;
  }

  if (sent > 0) {
    console.log('[qc-submit-reminders] sent', { sent, todayKey });
  }

  return { checked: assignments.length, sent, skippedAlreadySent };
}
