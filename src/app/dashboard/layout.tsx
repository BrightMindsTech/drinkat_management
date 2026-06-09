import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { isQcReviewerUser } from '@/lib/qc-reviewer';
import { prisma } from '@/lib/prisma';
import { InAppNotificationProvider } from '@/contexts/InAppNotificationContext';
import { AppResumeSync } from '@/components/AppResumeSync';
import { AppReconnectingNotice } from '@/components/AppReconnectingNotice';
import { DashboardSessionRecovery } from '@/components/DashboardSessionRecovery';
import { SessionKeepalive } from '@/components/SessionKeepalive';
import { SessionStabilityGuard } from '@/components/SessionStabilityGuard';
import { DashboardLayoutClient } from '@/components/dashboard/DashboardLayoutClient';
import { PushForegroundBridge } from '@/components/PushForegroundBridge';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('[dashboard/layout] getServerSession failed', error);
    return <DashboardSessionRecovery />;
  }
  if (!session) return <DashboardSessionRecovery />;

  const userId = (session.user as { id?: string }).id;
  if (!userId) return <DashboardSessionRecovery />;

  const navRole = normalizeUserRole(session.user.role);

  let userForNav: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;
  let headcountSummary: string | null = null;

  try {
    userForNav = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { include: { department: true } } },
    });

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
      const branches = await prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true },
      });
      const branchMap = new Map(branches.map((b) => [b.id, b.name]));
      const parts = Object.entries(countsByBranchId).map(([id, count]) => `${branchMap.get(id) ?? id}: ${count}`);
      if (parts.length > 0) headcountSummary = parts.join(' | ');
    }
  } catch (e) {
    console.error('[dashboard/layout] database read failed', e);
  }

  /** Staff in QC dept get manager-style nav; owner keeps owner nav (still full QC on `/dashboard/qc`). */
  const uiRole =
    navRole === 'staff' && isQcReviewerUser(session.user.role, userForNav?.employee ?? null) ? 'qc' : navRole;

  return (
    <InAppNotificationProvider>
      <PushForegroundBridge />
      <SessionStabilityGuard />
      <SessionKeepalive />
      <AppReconnectingNotice />
      <AppResumeSync />
      <DashboardLayoutClient role={uiRole} email={session.user.email ?? ''} headcountSummary={headcountSummary}>
        {children}
      </DashboardLayoutClient>
    </InAppNotificationProvider>
  );
}
