import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import { TimeClockGeofenceProvider } from '@/contexts/TimeClockGeofenceContext';
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const navRole = normalizeUserRole(session.user.role);

  let headcountSummary: string | null = null;
  if (navRole === 'owner') {
    const employees = await prisma.employee.findMany({
      where: { status: { not: 'terminated' } },
      select: { branchId: true },
    });
    const countsByBranchId = employees.reduce(
      (acc, e) => {
        acc[e.branchId] = (acc[e.branchId] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const branchIds = Object.keys(countsByBranchId);
    const branches = await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } });
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    const parts = Object.entries(countsByBranchId).map(([id, count]) => `${branchMap.get(id) ?? id}: ${count}`);
    if (parts.length > 0) headcountSummary = parts.join(' | ');
  }

  return (
    <TimeClockGeofenceProvider role={navRole}>
      <DashboardLayoutClient role={navRole} email={session.user.email ?? ''} headcountSummary={headcountSummary}>
        {children}
      </DashboardLayoutClient>
    </TimeClockGeofenceProvider>
  );
}
