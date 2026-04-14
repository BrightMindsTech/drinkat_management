import type { PrismaClient } from '@prisma/client';

/** Rolling window: delete messages (and empty threads / typing) older than this many hours. */
export const CHAT_RETENTION_HOURS = 24;

const WATERMARK_KEY = 'chat_retention';
/** Minimum time between purge runs (avoids work on every chat poll). */
const PURGE_THROTTLE_MS = 20 * 60 * 60 * 1000;

/**
 * Runs {@link purgeExpiredChat} at most once per ~20h (AppCronWatermark row `chat_retention`).
 * Called from `GET /api/chat/threads` so **no external scheduler** is required for retention.
 */
export async function maybePurgeChatIfDue(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  try {
    const row = await prisma.appCronWatermark.findUnique({
      where: { key: WATERMARK_KEY },
      select: { lastRunAt: true },
    });
    if (row && now.getTime() - row.lastRunAt.getTime() < PURGE_THROTTLE_MS) return;

    await purgeExpiredChat(prisma);
    await prisma.appCronWatermark.upsert({
      where: { key: WATERMARK_KEY },
      create: { key: WATERMARK_KEY, lastRunAt: now },
      update: { lastRunAt: now },
    });
  } catch (e) {
    console.error('[chat-retention] maybePurgeChatIfDue', e);
  }
}

/**
 * Purge chat data older than {@link CHAT_RETENTION_HOURS}.
 * Returns counts for logging/metrics.
 */
export async function purgeExpiredChat(prisma: PrismaClient): Promise<{
  messagesDeleted: number;
  threadsDeleted: number;
  typingDeleted: number;
}> {
  const cutoff = new Date(Date.now() - CHAT_RETENTION_HOURS * 60 * 60 * 1000);

  const delMsg = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  const typingDel = await prisma.chatTypingState.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  });

  const emptyThreads = await prisma.chatThread.findMany({
    where: { messages: { none: {} } },
    select: { id: true },
  });
  const emptyIds = emptyThreads.map((t) => t.id);
  if (emptyIds.length > 0) {
    await prisma.chatParticipant.deleteMany({ where: { threadId: { in: emptyIds } } });
  }
  const delThreads = await prisma.chatThread.deleteMany({
    where: { id: { in: emptyIds } },
  });

  return {
    messagesDeleted: delMsg.count,
    threadsDeleted: delThreads.count,
    typingDeleted: typingDel.count,
  };
}
