import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { AiUnavailableError, transcribeAudio } from '@/lib/ai-provider';
import { consumeAiUserQuota } from '@/lib/ai-rate-limit';

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('ai:use');
  const quota = consumeAiUserQuota(session.user.id);
  if (!quota.ok) {
    return Response.json(
      { error: 'AI rate limit. Try again shortly.', code: 'rate_limited' },
      { status: 429 }
    );
  }
  const form = await req.formData();
  const file = form.get('file');
  const language = String(form.get('language') ?? '');
  if (!(file instanceof File) || file.size < 1) {
    return Response.json({ error: 'audio file required', code: 'invalid_audio' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: 'audio too large (max 8MB)', code: 'invalid_audio' }, { status: 400 });
  }
  try {
    const result = await transcribeAudio(file, language === 'ar' || language === 'en' ? language : undefined);
    await prisma.aiRun.create({
      data: {
        kind: 'transcribe',
        inputJson: JSON.stringify({ bytes: file.size, language }),
        outputJson: JSON.stringify({ textLength: result.summary.length }),
        provider: result.provider,
        mocked: false,
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
      return Response.json(
        { error: e.message, code: e.code, mocked: false, live: false, humanMustConfirm: true },
        { status: e.status }
      );
    }
    return Response.json({ error: 'Transcription failed', code: 'provider_error', mocked: false }, { status: 503 });
  }
});
