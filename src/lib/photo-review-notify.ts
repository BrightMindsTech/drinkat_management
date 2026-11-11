import type { PrismaClient } from '@prisma/client';

/** Owner / QC / managers who can open the photo swipe queue. */
export async function listPhotoReviewerUserIds(
  prisma: PrismaClient,
  excludeUserId?: string
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['owner', 'qc', 'manager'] },
    },
    select: { id: true, employee: { select: { status: true } } },
  });
  return users
    .filter((u) => u.employee?.status !== 'terminated')
    .map((u) => u.id)
    .filter((id) => id !== excludeUserId);
}
