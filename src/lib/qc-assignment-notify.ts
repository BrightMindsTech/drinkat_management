import type { PrismaClient } from '@prisma/client';
import { formatAppDate } from '@/lib/format-datetime';
import { notifyUser, type UserNotifyInput } from '@/lib/user-notify';

export type QcAssignmentNotifyRow = {
  id: string;
  checklist: { name: string; repeatsDaily: boolean };
  dueDate: Date | null;
};

export function buildQcAssignmentNotifyInput(row: QcAssignmentNotifyRow): UserNotifyInput {
  const href = `/dashboard/qc#qc-assignment-${row.id}`;
  const dueHint =
    !row.checklist.repeatsDaily && row.dueDate ? ` Due ${formatAppDate(row.dueDate, 'en')}.` : '';
  const title = 'New checklist assigned';
  const body = `You were assigned "${row.checklist.name}".${dueHint}`;
  return {
    category: 'qc_assignment_created',
    title,
    body,
    dataJson: JSON.stringify({
      type: 'qc_assignment_created',
      href,
      assignmentId: row.id,
    }),
    push: {
      title,
      body,
      data: {
        type: 'qc_assignment_created',
        url: href,
        assignmentId: row.id,
      },
    },
  };
}

export async function notifyQcAssignment(
  prisma: PrismaClient,
  userId: string,
  row: QcAssignmentNotifyRow
) {
  return notifyUser(prisma, userId, buildQcAssignmentNotifyInput(row));
}
