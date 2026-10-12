import type { PrismaClient } from '@prisma/client';
import { getOwnerUserIds } from '@/lib/notify-helpers';
import { notifyUsers } from '@/lib/user-notify';

export type StaffNoteAudience = 'hr' | 'owner' | 'everyone';

const EVERYONE_COOLDOWN_MS = 2 * 60 * 1000;
const DIRECT_COOLDOWN_MS = 30 * 1000;

export function staffNoteCooldownMs(audience: StaffNoteAudience): number {
  return audience === 'everyone' ? EVERYONE_COOLDOWN_MS : DIRECT_COOLDOWN_MS;
}

export function staffNoteWatermarkKey(userId: string, audience: StaffNoteAudience): string {
  return `staff_note:${userId}:${audience}`;
}

export async function resolveStaffNoteRecipients(
  prisma: PrismaClient,
  audience: StaffNoteAudience,
  senderUserId: string
): Promise<string[]> {
  let ids: string[] = [];
  if (audience === 'owner') {
    ids = await getOwnerUserIds();
  } else if (audience === 'hr') {
    const hrs = await prisma.user.findMany({
      where: { hrKpiReviewer: true },
      select: { id: true },
    });
    ids = hrs.map((u) => u.id);
  } else {
    const users = await prisma.user.findMany({ select: { id: true } });
    ids = users.map((u) => u.id);
  }
  return [...new Set(ids.filter((id) => id && id !== senderUserId))];
}

export async function sendStaffNote(
  prisma: PrismaClient,
  input: {
    senderUserId: string;
    senderName: string;
    audience: StaffNoteAudience;
    title: string;
    body: string;
  }
): Promise<{ recipients: number; pushSent: number; cooldownRemainingMs?: number }> {
  const audience = input.audience;
  const title = input.title.trim();
  const body = input.body.trim();
  const key = staffNoteWatermarkKey(input.senderUserId, audience);
  const now = new Date();
  const row = await prisma.appCronWatermark.findUnique({ where: { key } });
  if (row) {
    const remaining = staffNoteCooldownMs(audience) - (now.getTime() - row.lastRunAt.getTime());
    if (remaining > 0) {
      return { recipients: 0, pushSent: 0, cooldownRemainingMs: remaining };
    }
  }

  const recipients = await resolveStaffNoteRecipients(prisma, audience, input.senderUserId);
  if (!recipients.length) {
    return { recipients: 0, pushSent: 0 };
  }

  const pushTitle = `${input.senderName}: ${title}`.slice(0, 80);
  const { pushSent } = await notifyUsers(prisma, recipients, {
    category: 'staff_note',
    title: pushTitle,
    body,
    dataJson: JSON.stringify({
      type: 'staff_note',
      audience,
      fromUserId: input.senderUserId,
      url: '/dashboard',
    }),
    push: {
      title: pushTitle,
      body,
      data: { type: 'staff_note', audience, url: '/dashboard' },
    },
  });

  await prisma.appCronWatermark.upsert({
    where: { key },
    create: { key, lastRunAt: now },
    update: { lastRunAt: now },
  });

  return { recipients: recipients.length, pushSent };
}
