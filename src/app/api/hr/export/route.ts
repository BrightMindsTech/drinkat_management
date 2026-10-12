import { prisma } from '@/lib/prisma';
import { requireCapability } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';

/**
 * Owner-only historical HR export. Read-only. Does not mutate or delete rows.
 */
export const GET = withApiErrors(async function GET() {
  await requireCapability('hr:admin');

  const [advances, leaveRequests, salaryCopies, documents, reviews, transfers] = await Promise.all([
    prisma.advance.findMany({
      include: { employee: { select: { id: true, name: true, branchId: true } } },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.leaveRequest.findMany({
      include: { employee: { select: { id: true, name: true, branchId: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.salaryCopy.findMany({
      include: { employee: { select: { id: true, name: true, branchId: true } } },
      orderBy: { periodMonth: 'desc' },
    }),
    prisma.employeeDocument.findMany({
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.performanceReview.findMany({
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employeeTransfer.findMany({
      include: {
        employee: { select: { id: true, name: true } },
        fromBranch: { select: { name: true } },
        toBranch: { select: { name: true } },
      },
      orderBy: { transferredAt: 'desc' },
    }),
  ]);

  return Response.json({
    exportedAt: new Date().toISOString(),
    purpose: 'historical_hr_archive',
    counts: {
      advances: advances.length,
      leaveRequests: leaveRequests.length,
      salaryCopies: salaryCopies.length,
      documents: documents.length,
      reviews: reviews.length,
      transfers: transfers.length,
    },
    advances,
    leaveRequests,
    salaryCopies,
    documents,
    reviews,
    transfers,
  });
});
