import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { AiUnavailableError, runAi, type AiKind } from '@/lib/ai-provider';
import { gatherCoachingEvidence, gatherDailyBriefFacts, sanitizeAiInput } from '@/lib/ai-facts';
import { loadInspectionImage } from '@/lib/ai-images';
import { actorCanReadUpload, objectKeyFromUploadPath } from '@/lib/upload-access';
import { retrieveApprovedSops } from '@/lib/ai-sop';
import { consumeAiUserQuota } from '@/lib/ai-rate-limit';
import { normalizeUserRole } from '@/lib/permissions';
import { z } from 'zod';

const schema = z.object({
  kind: z.enum(['photo_qc', 'daily_brief', 'sop', 'product_ref', 'coaching']),
  input: z.record(z.unknown()).default({}),
});

function fail(e: unknown): Response {
  if (e instanceof AiUnavailableError) {
    return Response.json(
      {
        error: e.message,
        code: e.code,
        mocked: false,
        live: false,
        humanMustConfirm: true,
      },
      { status: e.status }
    );
  }
  const message = e instanceof Error ? e.message : 'AI request failed';
  return Response.json({ error: message, code: 'provider_error', mocked: false, live: false }, { status: 503 });
}

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('ai:use');
  const quota = consumeAiUserQuota(session.user.id);
  if (!quota.ok) {
    return Response.json(
      { error: 'AI rate limit. Try again shortly.', code: 'rate_limited', retryAfterSec: quota.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfterSec) } }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const kind = parsed.data.kind as AiKind;
  const input = sanitizeAiInput(parsed.data.input);
  const role = normalizeUserRole(session.user.role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const actor = {
    role,
    employeeId: user?.employee?.id ?? null,
    branchId: user?.employee?.branchId ?? null,
  };

  try {
    if (kind === 'daily_brief') {
      input.facts = await gatherDailyBriefFacts(prisma, actor);
    }
    if (kind === 'coaching') {
      input.evidence = await gatherCoachingEvidence(prisma, actor);
    }
    if (kind === 'sop') {
      const retrieved = await retrieveApprovedSops(
        prisma,
        String(input.question ?? ''),
        String(input.locale ?? 'en')
      );
      if (retrieved.refuse) {
        await prisma.aiRun.create({
          data: {
            kind,
            inputJson: JSON.stringify({ question: input.question }),
            outputJson: JSON.stringify({ refused: true }),
            provider: 'none',
            mocked: false,
            errorCode: 'sop_no_match',
            createdById: session.user.id,
          },
        });
        return Response.json(
          {
            error: 'No approved SOP passage matches this question. The assistant will not guess.',
            code: 'sop_no_match',
            mocked: false,
            live: false,
            humanMustConfirm: true,
          },
          { status: 422 }
        );
      }
      input.passages = retrieved.passages;
    }

    const images = [];
    const employee = user?.employee ? { id: user.employee.id, branchId: user.employee.branchId } : null;
    async function assertImage(path: string) {
      const key = objectKeyFromUploadPath(path);
      if (!key) {
        throw new AiUnavailableError('invalid_image', 'Inspection photograph path is invalid.', 400);
      }
      const ok = await actorCanReadUpload(prisma, {
        objectKey: key,
        userId: session.user.id,
        role,
        employee,
      });
      if (!ok) {
        throw new AiUnavailableError('forbidden_image', 'You cannot use this photograph.', 403);
      }
      return loadInspectionImage(path);
    }
    if (kind === 'photo_qc') {
      const path = String(input.imagePath ?? '');
      if (!path) {
        return Response.json({ error: 'imagePath is required', code: 'invalid_image' }, { status: 400 });
      }
      images.push(await assertImage(path));
    }
    if (kind === 'product_ref') {
      const actual = String(input.actualImagePath ?? '');
      const reference = String(input.referenceImagePath ?? '');
      if (!actual || !reference) {
        return Response.json(
          { error: 'actualImagePath and referenceImagePath are required', code: 'invalid_image' },
          { status: 400 }
        );
      }
      images.push(await assertImage(reference), await assertImage(actual));
    }

    const result = await runAi(kind, input, images);
    await prisma.aiRun.create({
      data: {
        kind,
        inputJson: JSON.stringify({ kind, keys: Object.keys(input) }),
        outputJson: JSON.stringify({ summary: result.summary, suggestion: result.suggestion }),
        provider: result.provider,
        mocked: false,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedUsd: result.estimatedUsd,
        latencyMs: result.latencyMs,
        createdById: session.user.id,
      },
    });
    return Response.json({
      ...result,
      mocked: false,
      label: 'AI-GENERATED',
      humanMustConfirm: true,
    });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      await prisma.aiRun.create({
        data: {
          kind,
          inputJson: JSON.stringify({ keys: Object.keys(input) }),
          outputJson: JSON.stringify({ error: e.message }),
          provider: 'none',
          mocked: false,
          errorCode: e.code,
          createdById: session.user.id,
        },
      }).catch(() => undefined);
    }
    return fail(e);
  }
});
