import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { actorCanReadUpload, objectKeyFromUploadPath } from '@/lib/upload-access';
import { loadInspectionImage } from '@/lib/ai-images';
import { AiUnavailableError, runAi } from '@/lib/ai-provider';
import { photoQcSuggestionSchema } from '@/lib/ai-schemas';
import { computeAndStoreCurrentEmployeeKpis } from '@/lib/kpi-compute';
import { normalizeUserRole } from '@/lib/permissions';
import { parseCriteriaJson, scorePhotoCriteria } from '@/lib/photo-score';
import { employeeAssignedType } from '@/lib/photo-eligibility';
import { photoAiContext } from '@/lib/photo-ai-context';
import { clampPhotoLimits, normalizeSubmissionUploadPaths } from '@/lib/photo-multi';
import { isUniqueConflictError } from '@/lib/db-errors';
import {
  BRANCH_PHOTO_CLAIMED_CODE,
  claimPhotoWindowForBranch,
} from '@/lib/photo-branch-claim';
import { z } from 'zod';

const postSchema = z.object({
  taskId: z.string().min(4),
  uploadPath: z.string().min(4).optional(),
  uploadPaths: z.array(z.string().min(4)).optional(),
  measuredValue: z.string().optional(),
});

export const GET = withApiErrors(async function GET() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) return Response.json({ items: [] });
  const items = await prisma.photoCheckSubmission.findMany({
    where: { employeeId: user.employee.id },
    include: {
      type: { select: { titleEn: true, titleAr: true } },
      images: { orderBy: { sortOrder: 'asc' }, select: { uploadPath: true, sortOrder: true } },
    },
    orderBy: { submittedAt: 'desc' },
    take: 30,
  });
  return Response.json({ items });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('qc:submit');
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'taskId and at least one photo required' }, { status: 400 });
  const uploadPaths = normalizeSubmissionUploadPaths(parsed.data);
  if (!uploadPaths.length) return Response.json({ error: 'taskId and at least one photo required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) {
    return Response.json({ error: 'No employee profile is linked to this login.' }, { status: 400 });
  }

  const task = await prisma.photoCheckTask.findUnique({
    where: { id: parsed.data.taskId },
    include: {
      type: true,
      schedule: { select: { slotLabelEn: true, slotLabelAr: true } },
    },
  });
  if (!task || task.assigneeEmployeeId !== user.employee.id) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }
  if (['cancelled', 'excused', 'completed'].includes(task.status)) {
    return Response.json({ error: 'This task is not open' }, { status: 409 });
  }
  const alreadyClaimed = await prisma.photoCheckTask.findFirst({
    where: {
      scheduleId: task.scheduleId,
      periodKey: task.periodKey,
      branchId: task.branchId,
      status: 'completed',
      NOT: { id: task.id },
    },
    select: { id: true },
  });
  if (alreadyClaimed) {
    return Response.json(
      { error: 'A teammate already submitted this check for your branch.', code: BRANCH_PHOTO_CLAIMED_CODE },
      { status: 409 }
    );
  }
  const allowed = await employeeAssignedType(prisma, user.employee.id, task.typeId);
  if (!allowed) return Response.json({ error: 'This inspection is not assigned to you' }, { status: 403 });
  if (task.type.requiresMeasurement && !String(parsed.data.measuredValue ?? '').trim()) {
    return Response.json({ error: 'Measured value required' }, { status: 400 });
  }
  const limits = clampPhotoLimits(task.type.minPhotos, task.type.maxPhotos);
  if (uploadPaths.length < limits.min) {
    return Response.json(
      { error: `This check needs at least ${limits.min} photographs in one submission.` },
      { status: 400 }
    );
  }
  if (uploadPaths.length > limits.max) {
    return Response.json({ error: `At most ${limits.max} photographs per submission.` }, { status: 400 });
  }

  const role = normalizeUserRole(session.user.role);
  for (const uploadPath of uploadPaths) {
    const key = objectKeyFromUploadPath(uploadPath);
    if (!key) return Response.json({ error: 'Invalid photo path' }, { status: 400 });
    const canRead = await actorCanReadUpload(prisma, {
      objectKey: key,
      userId: session.user.id,
      role,
      employee: { id: user.employee.id, branchId: user.employee.branchId },
    });
    if (!canRead) return Response.json({ error: 'You cannot use this photograph.' }, { status: 403 });
  }
  const uploadPath = uploadPaths[0];

  const staffImages: { mime: string; base64: string }[] = [];
  try {
    for (const path of uploadPaths) {
      staffImages.push(await loadInspectionImage(path));
    }
  } catch {
    return Response.json(
      { error: 'One or more photographs could not be loaded from storage. Nothing was submitted.' },
      { status: 400 }
    );
  }

  const refs = await prisma.photoCheckReference.findMany({
    where: { typeId: task.typeId, approved: true },
    take: 3,
  });
  const criteria = parseCriteriaJson(task.type.criteriaJson);
  const ctx = await photoAiContext(prisma, { code: task.type.code, titleEn: task.type.titleEn });

  let created;
  try {
    created = await prisma.photoCheckSubmission.create({
      data: {
        employeeId: user.employee.id,
        branchId: user.employee.branchId,
        taskId: task.id,
        typeId: task.typeId,
        uploadPath,
        measuredValue: parsed.data.measuredValue?.trim() || null,
        aiVerdict: 'pending',
        status: 'pending_qc',
        images: {
          create: uploadPaths.map((path, sortOrder) => ({ uploadPath: path, sortOrder })),
        },
      },
    });
  } catch (e) {
    if (isUniqueConflictError(e)) {
      return Response.json({ error: 'This task was already submitted' }, { status: 409 });
    }
    throw e;
  }

  await prisma.photoCheckTask.updateMany({
    where: { id: task.id, status: { notIn: ['completed', 'cancelled', 'excused'] } },
    data: { status: 'completed', submissionId: created.id, updatedAt: new Date() },
  });

  const claim = await claimPhotoWindowForBranch(prisma, {
    winnerTaskId: task.id,
    submissionId: created.id,
    branchId: task.branchId,
    scheduleId: task.scheduleId,
    periodKey: task.periodKey,
  });
  if (claim.outcome !== 'won') {
    return Response.json(
      { error: 'A teammate already submitted this check for your branch.', code: BRANCH_PHOTO_CLAIMED_CODE },
      { status: 409 }
    );
  }

  let aiVerdict: 'pass' | 'fail' | 'unassessable' | 'pending' | 'unavailable' = 'unavailable';
  let aiScore: number | null = null;
  let aiExplanation: string | null = null;
  let aiClarity: string | null = null;
  let aiCriteriaJson: string | null = null;
  let aiRunId: string | null = null;
  let live = false;

  try {
    const images = [...staffImages];
    const refTake = 2;
    for (const ref of refs.slice(0, refTake)) {
      try {
        images.push(await loadInspectionImage(ref.uploadPath));
      } catch {
        // Skip a missing reference rather than failing the staff submit.
      }
    }
    const result = await runAi(
      'photo_qc',
      {
        title: task.type.titleEn,
        slotLabel: task.schedule.slotLabelEn,
        measuredValue: parsed.data.measuredValue ?? '',
        handwrittenNote: task.type.handwrittenNote ?? '',
        criteria,
        staffPhotoCount: uploadPaths.length,
        referenceCount: Math.min(refs.length, refTake),
        typeCode: task.type.code,
        fdaHints: ctx.fdaHints,
        sopExcerpts: ctx.sopExcerpts,
      },
      images
    );
    live = true;
    const suggestion = photoQcSuggestionSchema.safeParse(result.suggestion);
    if (suggestion.success) {
      const scored = scorePhotoCriteria(criteria, suggestion.data.criteria, suggestion.data.unassessable);
      aiVerdict = scored.outcome;
      aiScore = scored.score;
      aiExplanation = suggestion.data.explanation;
      aiClarity = suggestion.data.imageClarity;
      aiCriteriaJson = JSON.stringify(scored.assessments);
    } else {
      aiVerdict = 'unassessable';
      aiExplanation = result.summary;
    }
    const run = await prisma.aiRun.create({
      data: {
        kind: 'photo_qc',
        inputJson: JSON.stringify({ photoCheckId: created.id, taskId: task.id, type: task.type.code }),
        outputJson: JSON.stringify({ summary: result.summary, suggestion: result.suggestion, aiScore, aiVerdict }),
        provider: result.provider,
        mocked: false,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedUsd: result.estimatedUsd,
        latencyMs: result.latencyMs,
        createdById: session.user.id,
      },
    });
    aiRunId = run.id;
  } catch (e) {
    aiVerdict = 'unavailable';
    aiExplanation = e instanceof Error ? e.message : 'AI review failed';
    if (e instanceof AiUnavailableError) {
      await prisma.aiRun
        .create({
          data: {
            kind: 'photo_qc',
            inputJson: JSON.stringify({ photoCheckId: created.id }),
            outputJson: JSON.stringify({ error: e.message, code: e.code }),
            provider: 'none',
            mocked: false,
            errorCode: e.code,
            createdById: session.user.id,
          },
        })
        .catch(() => undefined);
    }
  }

  const item = await prisma.photoCheckSubmission.update({
    where: { id: created.id },
    data: { aiVerdict, aiScore, aiExplanation, aiClarity, aiCriteriaJson, aiRunId, status: 'pending_qc' },
  });

  let kpi = null;
  try {
    kpi = await computeAndStoreCurrentEmployeeKpis(prisma, user.employee.id);
  } catch {
    kpi = null;
  }

  return Response.json({
    item,
    live,
    humanMustConfirm: true,
    employeeOutcome: 'pending_qc',
    kpi,
    kpiBoosted: Boolean(kpi),
  });
});
