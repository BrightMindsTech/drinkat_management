import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { applyIssueTransition, actorMayVerify } from '@/lib/issue-lifecycle';
import { canSeeIssue } from '@/lib/issue-access';
import { ISSUE_STATUSES, RESPONSIBILITY_CLASSES, type IssueStatus } from '@/lib/qc-domains';
import { z } from 'zod';

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('transition'),
    status: z.enum(ISSUE_STATUSES),
    note: z.string().optional(),
    afterPhotoPath: z.string().optional(),
    correctiveAction: z.string().optional(),
  }),
  z.object({
    action: z.literal('comment'),
    body: z.string().min(1),
  }),
  z.object({
    action: z.literal('responsibility'),
    classification: z.enum(RESPONSIBILITY_CLASSES),
    note: z.string().optional(),
  }),
]);

export const GET = withApiErrors(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const role = normalizeUserRole(session.user.role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      events: { orderBy: { createdAt: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      responsibilityDecision: true,
    },
  });
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!canSeeIssue(role, user?.employee ?? null, issue)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return Response.json({
    ...issue,
    viewer: {
      role,
      canVerify: actorMayVerify(role),
      canUpdate: hasCapability(role, 'issues:update'),
    },
  });
});

export const PATCH = withApiErrors(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const role = normalizeUserRole(session.user.role);
  if (!hasCapability(role, 'issues:update') && !actorMayVerify(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!canSeeIssue(role, user?.employee ?? null, issue)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const body = parsed.data;

  if (body.action === 'comment') {
    const comment = await prisma.issueComment.create({
      data: { issueId: id, actorUserId: session.user.id, body: body.body },
    });
    return Response.json(comment);
  }

  if (body.action === 'responsibility') {
    if (!actorMayVerify(role)) {
      return Response.json({ error: 'Only Owner or QC can approve responsibility' }, { status: 403 });
    }
    const decision = await prisma.responsibilityDecision.upsert({
      where: { issueId: id },
      update: {
        classification: body.classification,
        approvedById: session.user.id,
        approvedAt: new Date(),
        note: body.note ?? null,
      },
      create: {
        issueId: id,
        classification: body.classification,
        approvedById: session.user.id,
        approvedAt: new Date(),
        note: body.note ?? null,
      },
    });
    await prisma.issue.update({
      where: { id },
      data: {
        responsibilityApproved: body.classification,
        responsibilityApprovedById: session.user.id,
      },
    });
    return Response.json(decision);
  }

  try {
    await applyIssueTransition(prisma, {
      issueId: id,
      toStatus: body.status as IssueStatus,
      actorUserId: session.user.id,
      actorRole: role,
      actorEmployeeId: user?.employee?.id,
      note: body.note,
      afterPhotoPath: body.afterPhotoPath,
      correctiveAction: body.correctiveAction,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Invalid transition' }, { status: 400 });
  }
  const updated = await prisma.issue.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: 'asc' } }, comments: true, responsibilityDecision: true },
  });
  return Response.json(updated);
});
