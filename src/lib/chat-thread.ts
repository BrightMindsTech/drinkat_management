import type { PrismaClient } from '@prisma/client';

export async function findDirectThreadForPair(
  prisma: PrismaClient,
  userIdA: string,
  userIdB: string
): Promise<{ id: string } | null> {
  const aThreads = await prisma.chatParticipant.findMany({
    where: { userId: userIdA },
    select: { threadId: true },
  });
  for (const { threadId } of aThreads) {
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { participants: { select: { userId: true } } },
    });
    if (!thread || thread.participants.length !== 2) continue;
    const ids = new Set(thread.participants.map((p) => p.userId));
    if (ids.has(userIdA) && ids.has(userIdB)) return { id: thread.id };
  }
  return null;
}

export async function createDirectThread(prisma: PrismaClient, userIdA: string, userIdB: string) {
  return prisma.chatThread.create({
    data: {
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    select: { id: true },
  });
}

export async function userParticipatesInThread(
  prisma: PrismaClient,
  threadId: string,
  userId: string
): Promise<boolean> {
  const row = await prisma.chatParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { userId: true },
  });
  return !!row;
}

export async function loadThreadWithTwoParticipants(prisma: PrismaClient, threadId: string) {
  return prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              employee: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export function displayNameForUser(u: {
  email: string;
  employee: { name: string } | null;
}): string {
  return u.employee?.name?.trim() || u.email.split('@')[0] || u.email;
}

export type ThreadListRow = {
  id: string;
  updatedAt: string;
  otherUserId: string;
  otherDisplayName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export async function listThreadsForUser(prisma: PrismaClient, userId: string): Promise<ThreadListRow[]> {
  const threads = await prisma.chatThread.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, email: true, employee: { select: { name: true } } },
          },
        },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, createdAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const out: ThreadListRow[] = [];
  for (const t of threads) {
    if (t.participants.length !== 2) continue;
    const mePart = t.participants.find((p) => p.userId === userId);
    const other = t.participants.find((p) => p.userId !== userId);
    if (!mePart || !other) continue;
    const last = t.messages[0] ?? null;
    const unread = await prisma.chatMessage.count({
      where: {
        threadId: t.id,
        senderUserId: { not: userId },
        ...(mePart.lastReadAt ? { createdAt: { gt: mePart.lastReadAt } } : {}),
      },
    });
    out.push({
      id: t.id,
      updatedAt: t.updatedAt.toISOString(),
      otherUserId: other.userId,
      otherDisplayName: displayNameForUser(other.user),
      lastMessageBody: last?.body ?? null,
      lastMessageAt: last?.createdAt.toISOString() ?? null,
      unreadCount: unread,
    });
  }
  return out;
}

export async function touchThreadUpdatedAt(prisma: PrismaClient, threadId: string) {
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}
