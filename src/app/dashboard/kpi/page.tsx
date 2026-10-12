import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasCapability } from '@/lib/permissions';
import { KpiPanel } from '@/components/qc-ops/KpiPanel';

export const dynamic = 'force-dynamic';

export default async function KpiPage() {
  const session = await getServerSession(authOptions);
  let roster = hasCapability(session?.user?.role, 'kpi:viewBranch');
  if (!roster && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hrKpiReviewer: true },
    });
    roster = Boolean(user?.hrKpiReviewer);
  }
  return (
    <div className="app-page">
      <KpiPanel roster={roster} />
    </div>
  );
}
