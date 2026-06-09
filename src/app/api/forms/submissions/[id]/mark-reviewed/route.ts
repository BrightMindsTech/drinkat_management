import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { withPrismaRetry } from '@/lib/prisma-retry';
import { apiErrorResponse } from '@/lib/api-route-error';

/** Branch manager acknowledges they reviewed a QC evaluation at their branch. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const role = normalizeUserRole(session.user.role);
    if (role !== 'manager') {
      return Response.json({ error: 'Only branch managers can mark QC evaluations as reviewed.' }, { status: 403 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return Response.json({ error: 'Session invalid.' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const user = await withPrismaRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, employee: { select: { branchId: true } } },
      })
    );
    if (!user?.employee) {
      return Response.json({ error: 'Manager profile not found.' }, { status: 403 });
    }

    const submission = await withPrismaRetry(() =>
      prisma.managementFormSubmission.findUnique({
        where: { id },
        select: {
          id: true,
          branchId: true,
          reviewedAt: true,
          template: { select: { category: true } },
        },
      })
    );
    if (!submission) {
      return Response.json({ error: 'Submission not found.' }, { status: 404 });
    }
    if (submission.template.category !== 'qc') {
      return Response.json({ error: 'Only QC evaluations can be marked reviewed here.' }, { status: 403 });
    }
    if (submission.branchId !== user.employee.branchId) {
      return Response.json({ error: 'This evaluation is for another branch.' }, { status: 403 });
    }

    if (submission.reviewedAt) {
      return Response.json({ ok: true, reviewedAt: submission.reviewedAt.toISOString() });
    }

    const reviewedAt = new Date();
    await withPrismaRetry(() =>
      prisma.managementFormSubmission.update({
        where: { id },
        data: { reviewedAt, reviewedById: user.id },
      })
    );

    return Response.json({ ok: true, reviewedAt: reviewedAt.toISOString() });
  } catch (e) {
    return apiErrorResponse('forms/mark-reviewed', e, 'Could not save review status.');
  }
}
