import { ammanCalendarDayKey, ammanDateParts, isSameAmmanCalendarDay } from '@/lib/format-datetime';

export type QcAssignmentPendingInput = {
  checklist: { repeatsDaily: boolean; deadlineTime: string };
  dueDate: Date | null;
  submissions: { submittedAt: Date }[];
};

/** True when this assignment still needs a photo submission from the assignee. */
export function assignmentNeedsSubmission(assignment: QcAssignmentPendingInput, now = new Date()): boolean {
  if (assignment.checklist.repeatsDaily) {
    return !assignment.submissions.some((s) => isSameAmmanCalendarDay(s.submittedAt, now));
  }
  return assignment.submissions.length === 0;
}

function parseDeadlineMinutes(deadlineTime: string): number {
  const [h, m] = deadlineTime.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 23 * 60 + 59;
  return h * 60 + m;
}

function ammanMinutesNow(now: Date): number {
  const { hours, minutes } = ammanDateParts(now);
  return hours * 60 + minutes;
}

/** Cron window — matches the 5-minute schedule. */
function inCronWindow(targetMinutes: number, nowMinutes: number, windowMinutes = 5): boolean {
  return nowMinutes >= targetMinutes && nowMinutes < targetMinutes + windowMinutes;
}

const MORNING_REMINDER_MINUTES = 9 * 60;

export type QcSubmitReminderSlot = 'morning' | 'deadline';

/** Whether cron should send a submit reminder push for this assignment right now. */
export function qcSubmitReminderSlotNow(
  assignment: QcAssignmentPendingInput,
  now = new Date()
): QcSubmitReminderSlot | null {
  if (!assignmentNeedsSubmission(assignment, now)) return null;

  const nowMin = ammanMinutesNow(now);
  const deadlineMin = parseDeadlineMinutes(assignment.checklist.deadlineTime);
  const todayKey = ammanCalendarDayKey(now);

  if (assignment.checklist.repeatsDaily) {
    if (inCronWindow(MORNING_REMINDER_MINUTES, nowMin)) return 'morning';
    if (inCronWindow(deadlineMin, nowMin)) return 'deadline';
    return null;
  }

  const dueKey = assignment.dueDate ? ammanCalendarDayKey(assignment.dueDate) : null;
  if (!dueKey) {
    if (inCronWindow(MORNING_REMINDER_MINUTES, nowMin)) return 'morning';
    return null;
  }
  if (todayKey < dueKey) return null;
  if (todayKey === dueKey) {
    if (inCronWindow(deadlineMin, nowMin)) return 'deadline';
    if (inCronWindow(MORNING_REMINDER_MINUTES, nowMin)) return 'morning';
    return null;
  }
  if (inCronWindow(MORNING_REMINDER_MINUTES, nowMin)) return 'morning';
  return null;
}

export function qcSubmitReminderWatermarkKey(assignmentId: string, dayKey: string, slot: QcSubmitReminderSlot): string {
  return `qc_submit_reminder:${assignmentId}:${dayKey}:${slot}`;
}
