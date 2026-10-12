import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { computeAndStoreCurrentEmployeeKpis } from '@/lib/kpi-compute';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { z } from 'zod';

const schema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(500).optional(),
});

export const POST = withApiErrors(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireCapability('qc:review');
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'decision must be approved or rejected' }, { status: 400 });

  const existing = await prisma.photoCheckSubmission.findUnique({
    where: { id },
    include: { employee: { select: { id: true, branchId: true } } },
  });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const role = normalizeUserRole(session.user.role);
  const scope = dataScopeForRole(role);
  if (scope === 'branch') {
    const reviewer = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (!reviewer?.employee || reviewer.employee.branchId !== existing.branchId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const now = new Date();
  const claimed = await prisma.photoCheckSubmission.updateMany({
    where: { id, status: 'pending_qc' },
    data: {
      status: parsed.data.decision,
      qcReviewedById: session.user.id,
      qcReviewedAt: now,
      qcNote: parsed.data.note ?? null,
      updatedAt: now,
    },
  });
  if (claimed.count === 0) {
    return Response.json({ error: 'Already reviewed' }, { status: 409 });
  }

  const item = await prisma.photoCheckSubmission.findUnique({ where: { id } });
  try {
    await computeAndStoreCurrentEmployeeKpis(prisma, existing.employeeId);
  } catch {
    // KPI recompute is best-effort; the swipe decision is already stored.
  }
  return Response.json({ item });
});
