import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeUserRole } from '@/lib/permissions';
import { PhotoOpsPanel } from '@/components/photo-check/PhotoOpsPanel';

export const dynamic = 'force-dynamic';

export default async function PhotoOpsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/dashboard');
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photoOpsAdmin: true },
    });
    if (!user?.photoOpsAdmin) redirect('/dashboard');
  }
  return (
    <div className="app-page">
      <PhotoOpsPanel />
    </div>
  );
}
