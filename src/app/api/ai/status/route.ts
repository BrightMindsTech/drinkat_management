import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { aiLiveEnabled, aiPaidUsageApproved, aiProviderName, AI_MODELS, getOpenAiApiKey } from '@/lib/ai-provider';

export const GET = withApiErrors(async function GET() {
  await requireCapability('ai:use');
  const approvedSops = await prisma.sopDocument.count({ where: { approved: true } });
  const live = aiLiveEnabled();
  return Response.json({
    live,
    mocked: false,
    provider: aiProviderName() || null,
    credentialsPresent: Boolean(getOpenAiApiKey()),
    paidUsageApproved: aiPaidUsageApproved(),
    models: AI_MODELS,
    sopDocumentsApproved: approvedSops,
    sopAssistant: approvedSops > 0 && live ? 'ready' : 'blocked',
    blockers: [
      !getOpenAiApiKey() || aiProviderName() !== 'openai' ? 'credentials_missing' : null,
      !aiPaidUsageApproved() ? 'budget_not_approved' : null,
      approvedSops === 0 ? 'sop_unavailable' : null,
    ].filter(Boolean),
    humanMustConfirm: true,
  });
});
