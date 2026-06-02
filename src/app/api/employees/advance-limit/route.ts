import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

const bulkAdvanceLimitSchema = z.object({
  advanceLimit: z.number().min(0).nullable(),
});

/**
 * Owner-only bulk update: set one advance limit for all active employees.
 * Pass `null` to clear the limit.
 */
export async function PATCH(req: Request) {
  await requireOwner();

  const raw = await req.json().catch(() => null);
  const parsed = bulkAdvanceLimitSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { advanceLimit } = parsed.data;
  const result = await prisma.employee.updateMany({
    where: { status: { not: 'terminated' } },
    data: { advanceLimit },
  });

  return Response.json({
    ok: true,
    updatedEmployees: result.count,
    advanceLimit,
  });
}
