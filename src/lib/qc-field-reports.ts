import type { PrismaClient } from '@prisma/client';

/** Owner, every manager, every QC account, and flagged HR (Sara). Never the sender. */
export async function resolveQcReportRecipients(
  prisma: PrismaClient,
  senderUserId: string
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ role: { in: ['owner', 'manager', 'qc'] } }, { hrKpiReviewer: true }],
    },
    select: { id: true },
  });
  return [...new Set(users.map((u) => u.id).filter((id) => id && id !== senderUserId))];
}
