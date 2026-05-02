import type { Session } from 'next-auth';
import type { PrismaClient } from '@prisma/client';
import { normalizeUserRole } from '@/lib/formVisibility';

type EmployeeForQc = {
  role: string;
  department: { name: string } | null;
} | null;

/**
 * Who can use QC supervisor tools: create/assign checklists, review all submissions.
 * Uses login role `owner` or `qc`, employee role `qc`, or department name (QC / Quality control).
 */
export function isQcReviewerUser(sessionUserRole: string | undefined, employee: EmployeeForQc): boolean {
  const r = normalizeUserRole(sessionUserRole);
  if (r === 'owner' || r === 'qc') return true;
  if (!employee) return false;
  if (employee.role === 'qc') return true;
  const dept = employee.department?.name?.trim().toLowerCase();
  if (!dept) return false;
  if (dept === 'qc' || dept === 'quality control') return true;
  return false;
}

export async function userHasQcReviewerScope(prisma: PrismaClient, session: Session | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  const r = normalizeUserRole(session.user.role);
  if (r === 'owner' || r === 'qc') return true;
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });
  return isQcReviewerUser(session.user.role, u?.employee ?? null);
}
