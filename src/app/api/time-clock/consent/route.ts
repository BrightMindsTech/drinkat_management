import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getTimeClockEmployee } from '@/lib/time-clock-helpers';

const bodySchema = z
  .object({
    location: z.boolean().optional(),
    push: z.boolean().optional(),
  })
  .refine((o) => o.location !== undefined || o.push !== undefined, { message: 'At least one flag required' });

export async function POST(req: Request) {
  const session = await requireSession();
  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Time clock does not apply to this account' }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const now = new Date();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(parsed.data.location !== undefined
        ? { locationConsentAt: parsed.data.location ? now : null }
        : {}),
      ...(parsed.data.push !== undefined ? { pushConsentAt: parsed.data.push ? now : null } : {}),
    },
  });

  return Response.json({ ok: true });
}
