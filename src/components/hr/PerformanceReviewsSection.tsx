'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Review = { id: string; reviewedAt: string | Date; rating: number; notes: string | null };

function StarPicker({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (n: number) => void;
  size?: 'sm' | 'md';
}) {
  const { t } = useLanguage();
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8';
  return (
    <div
      className="flex flex-row items-center gap-0.5"
      role="group"
      aria-label={t.reviews.rating}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 rounded-md touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue"
          aria-label={`${n} / 5`}
          aria-pressed={n <= value}
        >
          <svg viewBox="0 0 24 24" className={dim} aria-hidden>
            <path
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              className={n <= value ? 'fill-amber-400' : 'fill-gray-200 dark:fill-gray-600'}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

function StarsReadOnly({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className="inline-flex flex-row items-center gap-0.5 align-middle" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} viewBox="0 0 24 24" className={dim}>
          <path
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            className={n <= rating ? 'fill-amber-400' : 'fill-gray-200 dark:fill-gray-600'}
          />
        </svg>
      ))}
    </span>
  );
}

export function PerformanceReviewsSection({
  employeeId,
  canAddReviews,
  initialData,
}: {
  employeeId: string;
  canAddReviews: boolean;
  initialData?: Review[];
}) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/employees/${employeeId}/reviews`);
      const data = await res.json();
      if (!cancelled && res.ok) setReviews(data);
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeId, initialData]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, notes: notes || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews((prev) => [{ ...data, reviewedAt: data.reviewedAt }, ...prev]);
        setNotes('');
        setRating(3);
      }
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <p className="text-sm text-app-muted">{t.common.loading}</p>;

  return (
    <div className="space-y-3">
      {canAddReviews && (
        <form onSubmit={handleAdd} className="flex flex-col gap-3 p-3 rounded-lg bg-gray-100 dark:bg-ios-dark-elevated">
          <div>
            <span className="text-xs text-app-secondary block mb-2">{t.reviews.rating}</span>
            <StarPicker value={rating} onChange={setRating} size="md" />
          </div>
          <label className="block w-full">
            <span className="text-xs text-app-secondary">{t.reviews.notes}</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill px-2 py-1.5 text-sm"
            />
          </label>
          <button type="submit" disabled={adding} className="self-start rounded-ios bg-ios-blue text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
            {adding ? t.common.loading : t.reviews.addReview}
          </button>
        </form>
      )}
      {reviews.length === 0 && <p className="text-sm text-app-muted">{t.reviews.noReviews}</p>}
      <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator">
        {reviews.map((r) => (
          <li key={r.id} className="py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm text-app-secondary tabular-nums">
                {new Date(r.reviewedAt).toLocaleDateString()}
              </span>
              <StarsReadOnly rating={r.rating} size="sm" />
            </div>
            {r.notes && <p className="text-sm text-app-secondary mt-0.5">{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
