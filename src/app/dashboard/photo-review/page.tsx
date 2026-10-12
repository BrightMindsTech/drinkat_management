import { PhotoSwipeReview } from '@/components/photo-check/PhotoSwipeReview';

export const dynamic = 'force-dynamic';

export default function PhotoReviewPage() {
  return (
    <div className="app-page space-y-6">
      <PhotoSwipeReview />
    </div>
  );
}
