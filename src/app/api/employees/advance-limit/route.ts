import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hrOperationsFrozenResponse } from '@/lib/hr-operations-freeze';

const bulkAdvanceLimitSchema = z.object({
  advanceLimit: z.number().min(0).nullable(),
});

/**
 * Owner-only bulk update: set one advance limit for all active employees.
 * Pass `null` to clear the limit.
 */
export const PATCH = withApiErrors(async function PATCH(req: Request) {
  return hrOperationsFrozenResponse();
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
});
