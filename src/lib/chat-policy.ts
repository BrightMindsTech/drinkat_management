import type { PrismaClient } from '@prisma/client';
import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';

/** Effective branch for chat rules: User.branchId, else linked Employee.branchId. */
export async function getEffectiveBranchId(
  prisma: PrismaClient,
  userId: string
): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, employee: { select: { branchId: true, status: true } } },
  });
  if (!u) return null;
  if (u.branchId) return u.branchId;
  if (u.employee?.status === 'terminated') return null;
  return u.employee?.branchId ?? null;
}

export async function canUsersChat(
  prisma: PrismaClient,
  userIdA: string,
  userIdB: string
): Promise<{ ok: boolean; reason?: string }> {
  if (userIdA === userIdB) return { ok: false, reason: 'self' };

  const [a, b] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userIdA },
      select: { id: true, role: true, employee: { select: { status: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userIdB },
      select: { id: true, role: true, employee: { select: { status: true } } },
    }),
  ]);

  if (!a || !b) return { ok: false, reason: 'user_not_found' };

  const roleA = normalizeUserRole(a.role);
  const roleB = normalizeUserRole(b.role);

  if (a.employee?.status === 'terminated' || b.employee?.status === 'terminated') {
    return { ok: false, reason: 'terminated' };
  }

  if (roleA === 'owner' || roleB === 'owner') {
    return { ok: true };
  }

  const [branchA, branchB] = await Promise.all([
    getEffectiveBranchId(prisma, userIdA),
    getEffectiveBranchId(prisma, userIdB),
  ]);

  if (!branchA || !branchB || branchA !== branchB) {
    return { ok: false, reason: 'branch_mismatch' };
  }

  return { ok: true };
}

export function roleMayUseChat(role: string): boolean {
  const r = normalizeUserRole(role);
  return r === 'owner' || r === 'qc' || r === 'staff' || r === 'manager' || r === 'marketing';
}

export type ChatUserListRow = {
  id: string;
  displayName: string;
  role: AppUserRole;
};

export async function listChatEligiblePeers(
  prisma: PrismaClient,
  sessionUserId: string,
  sessionRole: string
): Promise<ChatUserListRow[]> {
  if (!roleMayUseChat(sessionRole)) return [];

  const me = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  });
  if (!me) return [];

  const others = await prisma.user.findMany({
    where: { id: { not: sessionUserId } },
    select: {
      id: true,
      role: true,
      email: true,
      employee: { select: { name: true, status: true } },
    },
    orderBy: { email: 'asc' },
    take: 500,
  });

  const rows: ChatUserListRow[] = [];
  for (const u of others) {
    if (u.employee?.status === 'terminated') continue;
    const gate = await canUsersChat(prisma, sessionUserId, u.id);
    if (!gate.ok) continue;
    const displayName = u.employee?.name?.trim() || u.email.split('@')[0] || u.id;
    rows.push({ id: u.id, displayName, role: normalizeUserRole(u.role) });
  }

  return rows;
}
