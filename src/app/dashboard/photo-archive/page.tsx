import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { userCanViewPhotoArchive } from '@/lib/photo-archive';
import { PhotoArchivePanel } from '@/components/photo-check/PhotoArchivePanel';

export const dynamic = 'force-dynamic';

export default async function PhotoArchivePage() {
  const session = await getServerSession(authOptions);
  if (!session || !(await userCanViewPhotoArchive(prisma, session))) redirect('/dashboard');
  return (
    <div className="app-page">
      <PhotoArchivePanel />
    </div>
  );
}
