import type { PrismaClient } from '@prisma/client';
import { normalizeUserRole } from '@/lib/permissions';

export const SARA_NOTIFY_EMAIL = 'sara@drinkat.com';

export type QcNotifyPerson = {
  userId: string;
  email: string;
  role: string;
  hrKpiReviewer: boolean;
  name: string;
  branchId: string;
  branchName: string;
};

export type QcReportNotifyTarget = 'all' | 'owner' | 'sara' | 'managers' | `manager:${string}`;

export type QcReportNotifyOption = { value: QcReportNotifyTarget; label: string };

export function isSaraNotifyUser(p: { email: string; hrKpiReviewer: boolean; role: string }): boolean {
  if (normalizeUserRole(p.role) === 'owner') return false;
  return p.hrKpiReviewer || p.email.trim().toLowerCase() === SARA_NOTIFY_EMAIL;
}

export function pickQcReportRecipientIds(
  people: QcNotifyPerson[],
  senderUserId: string,
  target: string
): string[] {
  const ids = new Set<string>();
  const add = (id: string) => {
    if (id && id !== senderUserId) ids.add(id);
  };
  const owners = people.filter((p) => normalizeUserRole(p.role) === 'owner');
  const sara = people.filter((p) => isSaraNotifyUser(p));
  const managers = people.filter((p) => normalizeUserRole(p.role) === 'manager');

  if (target === 'all') {
    for (const p of [...owners, ...sara, ...managers]) add(p.userId);
    return [...ids];
  }
  if (target === 'owner') {
    for (const p of owners) add(p.userId);
    return [...ids];
  }
  if (target === 'sara') {
    for (const p of sara) add(p.userId);
    return [...ids];
  }
  if (target === 'managers') {
    for (const p of managers) add(p.userId);
    return [...ids];
  }
  if (target.startsWith('manager:')) {
    const managerId = target.slice('manager:'.length);
    const hit = managers.find((p) => p.userId === managerId);
    if (hit) add(hit.userId);
    return [...ids];
  }
  for (const p of [...owners, ...sara, ...managers]) add(p.userId);
  return [...ids];
}

export async function listQcNotifyPeople(prisma: PrismaClient): Promise<QcNotifyPerson[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ role: { in: ['owner', 'manager'] } }, { hrKpiReviewer: true }],
    },
    select: {
      id: true,
      email: true,
      role: true,
      hrKpiReviewer: true,
      employee: { select: { name: true, status: true, branchId: true, branch: { select: { name: true } } } },
    },
  });
  return users
    .filter((u) => u.employee?.status !== 'terminated')
    .map((u) => ({
      userId: u.id,
      email: u.email,
      role: u.role,
      hrKpiReviewer: u.hrKpiReviewer,
      name: u.employee?.name || u.email,
      branchId: u.employee?.branchId || '',
      branchName: u.employee?.branch?.name || '',
    }));
}

export function qcReportNotifyOptions(people: QcNotifyPerson[]): QcReportNotifyOption[] {
  const options: QcReportNotifyOption[] = [{ value: 'all', label: 'all' }];
  if (people.some((p) => isSaraNotifyUser(p))) options.push({ value: 'sara', label: 'sara' });
  if (people.some((p) => normalizeUserRole(p.role) === 'owner')) options.push({ value: 'owner', label: 'owner' });
  if (people.some((p) => normalizeUserRole(p.role) === 'manager')) {
    options.push({ value: 'managers', label: 'managers' });
    for (const m of people.filter((p) => normalizeUserRole(p.role) === 'manager')) {
      options.push({ value: `manager:${m.userId}`, label: m.name });
    }
  }
  return options;
}

export async function resolveQcReportRecipients(
  prisma: PrismaClient,
  senderUserId: string,
  target: string = 'all'
): Promise<string[]> {
  const people = await listQcNotifyPeople(prisma);
  return pickQcReportRecipientIds(people, senderUserId, target);
}

/** Branch inspection always goes to Sara, the owner, and managers of that branch. */
export function pickBranchInspectionRecipientIds(
  people: QcNotifyPerson[],
  senderUserId: string,
  branchId: string
): string[] {
  const ids = new Set<string>();
  const add = (id: string) => {
    if (id && id !== senderUserId) ids.add(id);
  };
  for (const p of people) {
    const role = normalizeUserRole(p.role);
    if (role === 'owner' || isSaraNotifyUser(p)) add(p.userId);
    if (role === 'manager' && p.branchId === branchId) add(p.userId);
  }
  return [...ids];
}

export async function resolveBranchInspectionRecipients(
  prisma: PrismaClient,
  senderUserId: string,
  branchId: string
): Promise<string[]> {
  const people = await listQcNotifyPeople(prisma);
  return pickBranchInspectionRecipientIds(people, senderUserId, branchId);
}
