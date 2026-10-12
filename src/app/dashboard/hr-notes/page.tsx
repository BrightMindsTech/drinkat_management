import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasCapability } from '@/lib/permissions';
import { HrNotesPanel } from '@/components/notes/HrNotesPanel';

export const dynamic = 'force-dynamic';

export default async function HrNotesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/dashboard');
  let allowed = hasCapability(session.user.role, 'kpi:hrReview');
  if (!allowed) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hrKpiReviewer: true },
    });
    allowed = Boolean(user?.hrKpiReviewer);
  }
  if (!allowed) redirect('/dashboard');
  return <HrNotesPanel />;
}
