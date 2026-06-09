import { prisma } from '@/lib/prisma';

/** Login user id for an employee profile, if linked. */
export async function getUserIdForEmployeeId(employeeId: string): Promise<string | null> {
  const map = await getUserIdsForEmployeeIds([employeeId]);
  return map.get(employeeId) ?? null;
}

/** Batch-resolve employee → login user ids (skips employees with no account). */
export async function getUserIdsForEmployeeIds(employeeIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(employeeIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;

  const employees = await prisma.employee.findMany({
    where: { id: { in: unique } },
    select: { id: true, userId: true },
  });
  for (const emp of employees) {
    if (emp.userId) out.set(emp.id, emp.userId);
  }
  return out;
}
