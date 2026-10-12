import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import { isQcReviewerUser } from '@/lib/qc-reviewer';
import { computeAndStoreEmployeeKpi, resolveKpiPeriod } from '@/lib/kpi-compute';
import { DashboardHomeContent } from '@/components/dashboard/DashboardHomeContent';

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  const role = normalizeUserRole(session?.user?.role);
  const email = session?.user?.email ?? '';
  const userId = (session?.user as { id?: string } | undefined)?.id;

  let displayName = email.includes('@') ? (email.split('@')[0] ?? email) : email;
  let hrKpiReviewer = false;
  let qcHome = role === 'qc';
  let kpiScore: number | null = null;
  if (userId) {
    try {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          hrKpiReviewer: true,
          employee: { select: { id: true, name: true, role: true, department: { select: { name: true } } } },
        },
      });
      const n = row?.employee?.name?.trim();
      if (n) displayName = n;
      hrKpiReviewer = Boolean(row?.hrKpiReviewer);
      if (role !== 'owner' && role !== 'manager') {
        qcHome = isQcReviewerUser(session?.user?.role, row?.employee ?? null);
      }
      if (row?.employee?.id) {
        try {
          const { periodKey } = resolveKpiPeriod('day');
          const explanation = await computeAndStoreEmployeeKpi(prisma, row.employee.id, periodKey);
          kpiScore =
            explanation.individualScorePublished === false
              ? explanation.displayTotal ?? null
              : explanation.total;
        } catch {
          // Home still loads if KPI scoring blips.
        }
      }
    } catch {
      // Transient D1 blip — show email-derived name instead of crashing the home screen.
    }
  }

  return (
    <DashboardHomeContent
      email={email}
      role={role}
      displayName={displayName}
      hrKpiReviewer={hrKpiReviewer}
      qcHome={qcHome}
      kpiScore={kpiScore}
    />
  );
}
