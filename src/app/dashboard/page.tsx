import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import { DashboardHomeContent } from '@/components/dashboard/DashboardHomeContent';

export default async function DashboardHome() {
  const session = await getServerSession(authOptions);
  const role = normalizeUserRole(session?.user?.role);
  const email = session?.user?.email ?? '';
  const userId = session?.user?.id;

  let displayName = email.includes('@') ? (email.split('@')[0] ?? email) : email;
  if (userId) {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { employee: { select: { name: true } } },
    });
    const n = row?.employee?.name?.trim();
    if (n) displayName = n;
  }

  return <DashboardHomeContent email={email} role={role} displayName={displayName} />;
}
