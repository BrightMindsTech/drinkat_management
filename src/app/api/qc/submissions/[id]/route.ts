import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { userHasQcReviewerScope } from '@/lib/qc-reviewer';
import { getUserIdForEmployeeId } from '@/lib/employee-user';
import { notifyUser } from '@/lib/user-notify';
import { z } from 'zod';

const reviewSchema = z.object({
  status: z.enum(['approved', 'denied']),
  rating: z.number().min(1).max(5).optional(),
  comments: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!(await userHasQcReviewerScope(prisma, session))) return new Response(null, { status: 403 });
  const { id } = await params;
  const submission = await prisma.qcSubmission.findUnique({
    where: { id },
    include: {
      assignment: { include: { checklist: { include: { items: true } }, employee: true, branch: true } },
      employee: { include: { branch: true } },
      photos: true,
    },
  });
  if (!submission) return new Response(null, { status: 404 });
  return Response.json(submission);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!(await userHasQcReviewerScope(prisma, session))) return new Response(null, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const submission = await prisma.qcSubmission.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rating: parsed.data.rating ?? null,
      comments: parsed.data.comments ?? null,
      reviewedAt: new Date(),
    },
    include: {
      assignment: { include: { checklist: true, employee: true, branch: true } },
      employee: { include: { branch: true } },
      photos: true,
    },
  });

  const employeeUserId = await getUserIdForEmployeeId(submission.employeeId);
  if (employeeUserId) {
    const href = '/dashboard/qc';
    const statusLabel = parsed.data.status === 'approved' ? 'approved' : 'denied';
    const reviewTitle = `QC submission ${statusLabel}`;
    const reviewBody = `${submission.assignment.checklist.name} was ${statusLabel}.`;
    await notifyUser(prisma, employeeUserId, {
      category: 'qc_review_result',
      title: reviewTitle,
      body: reviewBody,
      dataJson: JSON.stringify({
        type: 'qc_submission_reviewed',
        submissionId: submission.id,
        status: parsed.data.status,
        href,
      }),
      push: {
        title: reviewTitle,
        body: reviewBody,
        data: { type: 'qc_submission_reviewed', url: href, submissionId: submission.id },
      },
    });
  }

  return Response.json(submission);
}
