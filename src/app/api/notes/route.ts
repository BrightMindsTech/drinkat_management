import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { sendStaffNote, type StaffNoteAudience } from '@/lib/staff-notes';

const bodySchema = z.object({
  audience: z.enum(['hr', 'owner', 'everyone']),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(500),
});

export const POST = withApiErrors(async function POST(req: Request) {
  const session = await requireSession();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Enter a title and message.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, employee: { select: { name: true } } },
  });
  const senderName = user?.employee?.name?.trim() || user?.email || 'Staff';

  const result = await sendStaffNote(prisma, {
    senderUserId: session.user.id,
    senderName,
    audience: parsed.data.audience as StaffNoteAudience,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  if (result.cooldownRemainingMs && result.cooldownRemainingMs > 0) {
    return Response.json(
      {
        error: 'Please wait before sending another note.',
        cooldownRemainingMs: result.cooldownRemainingMs,
      },
      { status: 429 }
    );
  }
  if (result.recipients === 0) {
    return Response.json({ error: 'No one is available for that audience.' }, { status: 409 });
  }

  return Response.json({ ok: true, ...result });
});
