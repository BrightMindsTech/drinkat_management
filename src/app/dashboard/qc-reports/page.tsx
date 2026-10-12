import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasCapability, normalizeUserRole } from '@/lib/permissions';
import { QcFieldReportsPanel } from '@/components/qc/QcFieldReportsPanel';

export const dynamic = 'force-dynamic';

export default async function QcReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/dashboard');
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'qc' && role !== 'manager') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { qcReportsInbox: true },
    });
    if (!user?.qcReportsInbox) redirect('/dashboard');
  }
  const canCreate = role === 'owner' || role === 'qc' || (hasCapability(role, 'qc:review') && role !== 'manager');
  return (
    <div className="app-page">
      <QcFieldReportsPanel canCreate={canCreate} />
    </div>
  );
}
