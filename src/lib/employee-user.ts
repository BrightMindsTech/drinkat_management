import { prisma } from '@/lib/prisma';

/** Login user id for an employee profile, if linked. */
export async function getUserIdForEmployeeId(employeeId: string): Promise<string | null> {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userId: true },
  });
  return emp?.userId ?? null;
}
