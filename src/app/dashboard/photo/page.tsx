import { Suspense } from 'react';
import { PhotoTaskBoard } from '@/components/photo-check/PhotoTaskBoard';

export const dynamic = 'force-dynamic';

export default function PhotoCheckPage() {
  return (
    <div className="app-page space-y-6">
      <Suspense fallback={null}>
        <PhotoTaskBoard />
      </Suspense>
    </div>
  );
}
