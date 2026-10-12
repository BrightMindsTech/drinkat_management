import type { PrismaClient } from '@prisma/client';
import {
  answerFailsField,
  isFieldVisible,
  parseTemplateFields,
  type FormFieldDef,
} from '@/lib/formTemplate';
import type { IssueStatus } from '@/lib/qc-domains';

const TRANSITIONS: Record<string, readonly string[]> = {
  open: ['acknowledged', 'in_progress'],
  acknowledged: ['in_progress'],
  in_progress: ['fixed'],
  fixed: ['verified', 'reopened'],
  reopened: ['in_progress'],
  verified: ['closed'],
  closed: [],
};

export function canTransitionIssue(from: string, to: string): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

export function canVerifyIssue(role: string | undefined | null): boolean {
  return actorMayVerify(role);
}

/** Owner or QC only — managers cannot verify, including their own corrections. */
export function actorMayVerify(role: string | undefined | null): boolean {
  const r = String(role ?? '').toLowerCase();
  return r === 'owner' || r === 'qc';
}

export function sourceAnswerId(submissionId: string, questionKey: string): string {
  return `${submissionId}:${questionKey}`;
}

export async function createIssuesFromFailedAnswers(
  prisma: PrismaClient,
  opts: {
    submissionId: string;
    inspectionTaskId: string | null;
    branchId: string;
    answers: Record<string, string>;
    fields: FormFieldDef[];
    defaultAssigneeEmployeeId: string | null;
  }
): Promise<{ created: number; issueIds: string[]; assigneeEmployeeId: string | null }> {
  let created = 0;
  const issueIds: string[] = [];
  for (const field of opts.fields) {
    if (!isFieldVisible(field, opts.answers)) continue;
    const value = opts.answers[field.key] ?? '';
    if (!answerFailsField(field, value)) continue;
    const source = sourceAnswerId(opts.submissionId, field.key);
    const existing = await prisma.issue.findUnique({ where: { sourceAnswerId: source } });
    if (existing) continue;
    const beforePhoto = field.type === 'photo' ? value || null : opts.answers[`${field.key}_photo`] ?? null;
    const row = await prisma.issue.create({
      data: {
        sourceAnswerId: source,
        status: 'open',
        branchId: opts.branchId,
        inspectionTaskId: opts.inspectionTaskId,
        submissionId: opts.submissionId,
        questionKey: field.key,
        questionLabel: field.label,
        severity: field.severity ?? 'medium',
        assigneeEmployeeId: opts.defaultAssigneeEmployeeId,
        beforePhotoPath: beforePhoto || null,
        events: {
          create: { toStatus: 'open', note: 'Created from failed inspection answer' },
        },
      },
    });
    created += 1;
    issueIds.push(row.id);
  }
  return { created, issueIds, assigneeEmployeeId: opts.defaultAssigneeEmployeeId };
}

export async function applyIssueTransition(
  prisma: PrismaClient,
  opts: {
    issueId: string;
    toStatus: IssueStatus;
    actorUserId: string;
    actorRole: string;
    actorEmployeeId?: string | null;
    note?: string;
    afterPhotoPath?: string;
    correctiveAction?: string;
  }
) {
  const issue = await prisma.issue.findUnique({ where: { id: opts.issueId } });
  if (!issue) throw new Error('Issue not found');
  if (!canTransitionIssue(issue.status, opts.toStatus)) {
    throw new Error(`Cannot move issue from ${issue.status} to ${opts.toStatus}`);
  }
  if (opts.toStatus === 'verified' || opts.toStatus === 'closed') {
    if (!actorMayVerify(opts.actorRole)) {
      throw new Error('Only Owner or QC can verify and close issues');
    }
  }
  if (opts.toStatus === 'fixed' && !opts.afterPhotoPath && !issue.afterPhotoPath) {
    throw new Error('After photo is required before marking fixed');
  }

  const data: {
    status: string;
    afterPhotoPath?: string;
    correctiveAction?: string;
    verifiedAt?: Date;
    verifiedById?: string;
    closedAt?: Date;
    reopenCount?: number;
  } = { status: opts.toStatus };
  if (opts.afterPhotoPath) data.afterPhotoPath = opts.afterPhotoPath;
  if (opts.correctiveAction) data.correctiveAction = opts.correctiveAction;
  if (opts.toStatus === 'verified') {
    data.verifiedAt = new Date();
    data.verifiedById = opts.actorUserId;
  }
  if (opts.toStatus === 'closed') data.closedAt = new Date();
  if (opts.toStatus === 'reopened') data.reopenCount = issue.reopenCount + 1;

  await prisma.issue.update({
    where: { id: opts.issueId },
    data: {
      ...data,
      events: {
        create: {
          fromStatus: issue.status,
          toStatus: opts.toStatus,
          actorUserId: opts.actorUserId,
          note: opts.note ?? null,
        },
      },
    },
  });
}

export function parseTemplateFieldsSafe(fieldsJson: string): FormFieldDef[] {
  return parseTemplateFields(fieldsJson);
}
