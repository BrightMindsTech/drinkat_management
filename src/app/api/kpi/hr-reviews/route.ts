import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHrKpiReviewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { computeAndStoreEmployeeKpi, resolveKpiPeriod } from '@/lib/kpi-compute';
import { z } from 'zod';

const postSchema = z.object({
  employeeId: z.string().min(1),
  periodKey: z.string().regex(/^(\d{4}-\d{2}-\d{2}|\d{4}-W\d{2}|\d{4}-\d{2})$/).optional(),
  action: z.enum(['comment', 'flag', 'complete']),
  comments: z.string().max(4000).optional(),
  flaggedReason: z.string().max(2000).optional(),
});

export const GET = withApiErrors(async function GET(req: NextRequest) {
  const session = await requireHrKpiReviewer();
  const role = normalizeUserRole(session.user.role);
  const { periodKey } = resolveKpiPeriod(new URL(req.url).searchParams.get('periodKey'));
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true, employee: { select: { branchId: true } } },
  });
  const viewAll = role === 'owner' || role === 'qc' || Boolean(user?.hrKpiReviewer);
  const branchId = viewAll ? undefined : user?.employee?.branchId ?? '__none__';
  const reviews = await prisma.kpiHrReview.findMany({
    where: { periodKey, mode: 'operational' },
    orderBy: { updatedAt: 'desc' },
    take: 80,
  });
  const empIds = [...new Set(reviews.map((r) => r.employeeId))];
  const employees = await prisma.employee.findMany({
    where: { id: { in: empIds }, ...(branchId ? { branchId } : {}) },
    select: { id: true, name: true, role: true, branchId: true },
  });
  const allowed = new Set(employees.map((e) => e.id));
  return Response.json({
    periodKey,
    purpose: 'operational_hr_review_only',
    employmentDecisionUse: false,
    canOverwriteTotals: false,
    reviews: reviews
      .filter((r) => allowed.has(r.employeeId))
      .map((r) => ({
        ...r,
        employee: employees.find((e) => e.id === r.employeeId) ?? null,
      })),
  });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireHrKpiReviewer();
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const periodKey = parsed.data.periodKey ?? resolveKpiPeriod('month').periodKey;
  const role = normalizeUserRole(session.user.role);
  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hrKpiReviewer: true, employee: { select: { branchId: true } } },
  });
  const subject = await prisma.employee.findUnique({
    where: { id: parsed.data.employeeId },
    select: { id: true, role: true, branchId: true, name: true },
  });
  if (!subject) return Response.json({ error: 'Not found' }, { status: 404 });
  const viewAll = role === 'owner' || role === 'qc' || Boolean(actor?.hrKpiReviewer);
  if (!viewAll && actor?.employee?.branchId !== subject.branchId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!hasCapability(role, 'kpi:hrReview') && role !== 'owner') {
    /* assigned reviewer already passed requireHrKpiReviewer */
  }

  const explanation = await computeAndStoreEmployeeKpi(prisma, subject.id, periodKey);
  const status =
    parsed.data.action === 'complete' ? 'completed' : parsed.data.action === 'flag' ? 'flagged' : 'pending';
  const review = await prisma.kpiHrReview.upsert({
    where: {
      employeeId_periodKey_mode: { employeeId: subject.id, periodKey, mode: 'operational' },
    },
    update: {
      status,
      comments: parsed.data.comments ?? undefined,
      flaggedReason: parsed.data.action === 'flag' ? parsed.data.flaggedReason ?? parsed.data.comments ?? null : undefined,
      calculatedTotal: explanation.total,
      calculatedSnapshotJson: JSON.stringify(explanation),
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
    create: {
      employeeId: subject.id,
      periodKey,
      mode: 'operational',
      status,
      comments: parsed.data.comments ?? null,
      flaggedReason: parsed.data.action === 'flag' ? parsed.data.flaggedReason ?? parsed.data.comments ?? null : null,
      calculatedTotal: explanation.total,
      calculatedSnapshotJson: JSON.stringify(explanation),
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });
  return Response.json({
    id: review.id,
    status: review.status,
    calculatedTotal: review.calculatedTotal,
    canOverwriteTotals: false,
    employmentDecisionUse: false,
    individualScorePublished: explanation.individualScorePublished,
  });
});
