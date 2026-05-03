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
    if (!thread || thread.kind === 'group' || thread.participants.length !== 2) continue;
    const ids = new Set(thread.participants.map((p) => p.userId));
    if (ids.has(userIdA) && ids.has(userIdB)) return { id: thread.id };
  }
  return null;
}

export async function createDirectThread(prisma: PrismaClient, userIdA: string, userIdB: string) {
  return prisma.chatThread.create({
    data: {
      kind: 'direct',
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
    select: { id: true },
  });
}

/** Group chat with fixed membership (creator becomes a participant automatically). */
export async function createGroupThread(
  prisma: PrismaClient,
  creatorUserId: string,
  otherParticipantIds: string[],
  title?: string | null
) {
  const others = [...new Set(otherParticipantIds)].filter((id) => id && id !== creatorUserId);
  const userIds = [creatorUserId, ...others];
  return prisma.chatThread.create({
    data: {
      kind: 'group',
      ...(title?.trim() ? { title: title.trim() } : {}),
      participants: {
        create: userIds.map((userId) => ({ userId })),
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

export async function loadThreadWithParticipants(prisma: PrismaClient, threadId: string) {
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

/** @deprecated use loadThreadWithParticipants */
export async function loadThreadWithTwoParticipants(prisma: PrismaClient, threadId: string) {
  return loadThreadWithParticipants(prisma, threadId);
}

export function displayNameForUser(u: {
  email: string;
  employee: { name: string } | null;
}): string {
  return u.employee?.name?.trim() || u.email.split('@')[0] || u.email;
}

/** Matches messaging API: DM = exactly two participants and not flagged as group. */
export function chatThreadIsDirect(thread: { kind: string; participants: { length: number } }) {
  return thread.participants.length === 2 && thread.kind !== 'group';
}

export function senderDisplayNameInThread(
  thread: NonNullable<Awaited<ReturnType<typeof loadThreadWithParticipants>>>,
  senderUserId: string
): string {
  const part = thread.participants.find((p) => p.userId === senderUserId);
  if (!part) return 'Unknown';
  return displayNameForUser(part.user);
}

export type ThreadListRow = {
  id: string;
  updatedAt: string;
  kind: 'direct' | 'group';
  otherUserId: string | null;
  otherDisplayName: string | null;
  /** Group-specific */
  title: string | null;
  groupSubtitle: string | null;
  /** Sidebar / conversation header primary label */
  threadLabel: string;
  members: { userId: string; displayName: string }[];
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
    const members = t.participants.map((p) => ({
      userId: p.userId,
      displayName: displayNameForUser(p.user),
    }));
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const mePart = t.participants.find((p) => p.userId === userId);
    const last = t.messages[0] ?? null;
    const unread = await prisma.chatMessage.count({
      where: {
        threadId: t.id,
        senderUserId: { not: userId },
        ...(mePart?.lastReadAt ? { createdAt: { gt: mePart.lastReadAt } } : {}),
      },
    });

    // 3+ people is always treated as group (fixes rows where DB still has kind='direct' due to stale writes).
    if (t.kind === 'group' || t.participants.length >= 3) {
      const others = members.filter((m) => m.userId !== userId).map((m) => m.displayName);
      const preview =
        others.length <= 3
          ? others.join(', ')
          : [...others.slice(0, 2), `+${others.length - 2}`].join(', ');
      const threadLabel = t.title?.trim() || preview || `Group (${t.participants.length})`;
      out.push({
        id: t.id,
        updatedAt: t.updatedAt.toISOString(),
        kind: 'group',
        otherUserId: null,
        otherDisplayName: null,
        title: t.title ?? null,
        groupSubtitle: t.title?.trim() ? preview : null,
        threadLabel,
        members,
        lastMessageBody: last?.body ?? null,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
        unreadCount: unread,
      });
      continue;
    }

    if (t.participants.length === 2 && t.kind !== 'group') {
      const other = t.participants.find((p) => p.userId !== userId);
      if (!mePart || !other) continue;
      const dn = displayNameForUser(other.user);
      out.push({
        id: t.id,
        updatedAt: t.updatedAt.toISOString(),
        kind: 'direct',
        otherUserId: other.userId,
        otherDisplayName: dn,
        title: null,
        groupSubtitle: null,
        threadLabel: dn,
        members,
        lastMessageBody: last?.body ?? null,
        lastMessageAt: last?.createdAt.toISOString() ?? null,
        unreadCount: unread,
      });
    }
  }
  return out;
}

export async function touchThreadUpdatedAt(prisma: PrismaClient, threadId: string) {
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}
