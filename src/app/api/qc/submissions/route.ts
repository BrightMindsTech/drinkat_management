import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';
import { runQcPhotoMonthlyCleanupIfDue } from '@/lib/qc-photo-cleanup';
import { createInboxForUsers } from '@/lib/time-clock-helpers';
import { sendPushToUser } from '@/lib/push';
import { z } from 'zod';

const createSchema = z.object({
  assignmentId: z.string(),
  photoUrls: z.array(z.string().min(1)), // paths like /uploads/xxx.jpg
  itemIdToPhoto: z.record(z.string(), z.string()).optional(), // optional: itemId -> photoUrl
});

export async function GET(req: NextRequest) {
  await runQcPhotoMonthlyCleanupIfDue();
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const assignmentId = searchParams.get('assignmentId');

  if (await userHasQcReviewerScope(prisma, session)) {
    const submissions = await prisma.qcSubmission.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(assignmentId ? { assignmentId } : {}),
      },
      include: {
        assignment: { include: { checklist: { include: { items: true } }, employee: true, branch: true } },
        employee: { include: { branch: true } },
        branch: true,
        photos: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return Response.json(submissions);
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
  if (!user?.employee) return Response.json([]);
  const submissions = await prisma.qcSubmission.findMany({
    where: { employeeId: user.employee.id },
    include: {
      assignment: { include: { checklist: { include: { items: true } } } },
      photos: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return Response.json(submissions);
}

export async function POST(req: NextRequest) {
  await runQcPhotoMonthlyCleanupIfDue();
  const session = await requireSession();
  if (session.user.role !== 'staff' && session.user.role !== 'qc')
    return new Response(JSON.stringify({ error: 'Only staff can submit QC' }), { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
  if (!user?.employee) return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 400 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const assignment = await prisma.checklistAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    include: { checklist: true },
  });
  if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });
  if (assignment.employeeId !== user.employee.id) return new Response(JSON.stringify({ error: 'Not your assignment' }), { status: 403 });

  const submittedAt = new Date();

  // Compute deadline and late status
  const [deadlineHour, deadlineMin] = assignment.checklist.deadlineTime.split(':').map(Number);
  let deadline: Date;
  if (assignment.checklist.repeatsDaily) {
    const subDate = new Date(submittedAt);
    deadline = new Date(subDate.getFullYear(), subDate.getMonth(), subDate.getDate(), deadlineHour, deadlineMin, 0);
  } else {
    // Backward-compatibility: older assignments might not have dueDate.
    // In that case, treat today as due date instead of rejecting submission.
    const due = assignment.dueDate ? new Date(assignment.dueDate) : new Date(submittedAt);
    deadline = new Date(due.getFullYear(), due.getMonth(), due.getDate(), deadlineHour, deadlineMin, 0);
  }

  const isLate = submittedAt > deadline;
  let lateNote: string | null = null;
  if (isLate) {
    const diffMs = submittedAt.getTime() - deadline.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const lateStr = diffHours > 0 ? `${diffHours}h ${mins}m` : `${diffMins}m`;
    lateNote = `Submitted ${lateStr} after deadline (${deadline.toLocaleString()})`;
  }

  const submission = await prisma.qcSubmission.create({
    data: {
      assignmentId: parsed.data.assignmentId,
      employeeId: user.employee.id,
      branchId: assignment.branchId,
      isLate,
      lateNote,
      photos: {
        create: parsed.data.photoUrls.map((url) => ({
          filePath: url,
          itemId: null,
        })),
      },
    },
    include: {
      assignment: { include: { checklist: { include: { items: true } } } },
      photos: true,
    },
  });

  const qcReviewerUsers = await prisma.user.findMany({
    where: {
      role: 'qc',
      employee: { is: { status: { in: ['active', 'on_leave'] } } },
    },
    select: { id: true },
  });
  const qcReviewerUserIds = qcReviewerUsers.map((u) => u.id);
  if (qcReviewerUserIds.length > 0) {
    const href = `/dashboard/qc#qc-review-submission-${submission.id}`;
    await createInboxForUsers(qcReviewerUserIds, {
      category: 'qc_review',
      title: 'QC submission needs review',
      body: `${user.employee.name} submitted ${assignment.checklist.name}.`,
      dataJson: JSON.stringify({
        type: 'qc_submission_pending_review',
        submissionId: submission.id,
        assignmentId: assignment.id,
        href,
      }),
    });
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: qcReviewerUserIds } } });
    for (const userId of qcReviewerUserIds) {
      await sendPushToUser(
        userId,
        subs.filter((s) => s.userId === userId),
        {
          title: 'QC submission needs review',
          body: `${user.employee.name} submitted ${assignment.checklist.name}.`,
          data: {
            type: 'qc_submission_pending_review',
            url: href,
            submissionId: submission.id,
          },
        }
      );
    }
  }

  return Response.json(submission);
}
