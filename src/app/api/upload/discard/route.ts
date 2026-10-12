import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { discardUncommittedUploads, isDiscardReason } from '@/lib/photo-upload-discard';
import { z } from 'zod';

const schema = z.object({
  paths: z.array(z.string().min(4)).max(3),
  reason: z.string().min(4),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireSession();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success || !isDiscardReason(parsed.data.reason)) {
    return Response.json({ error: 'paths and a valid reason required' }, { status: 400 });
  }
  const result = await discardUncommittedUploads(prisma, {
    userId: session.user.id,
    paths: parsed.data.paths,
    reason: parsed.data.reason,
  });
  return Response.json({ ok: true, ...result });
});
