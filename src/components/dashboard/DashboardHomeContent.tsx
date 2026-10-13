'use client';

import Link from 'next/link';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { getDashboardHomeTiles, type HomeTileLabelKey } from '@/lib/dashboard-home-tiles';
import { PhotoSwipeReview } from '@/components/photo-check/PhotoSwipeReview';

function IconClipboardCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M12 17V5M6 17v-3" />
    </svg>
  );
}

function IconMegaphone({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m3 11 19-7v16L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function IconLifeBuoy({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 4.24 4.24" />
      <path d="m14.83 9.17 4.24-4.24" />
      <path d="m14.83 14.83 4.24 4.24" />
      <path d="m9.17 14.83-4.24 4.24" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconNotepad({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M8 3h8" />
      <path d="M12 3v4" />
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function IconCamera({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function IconDocument({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  );
}

function IconArchive({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function HomeTileIcon({ labelKey }: { labelKey: HomeTileLabelKey }) {
  const className = 'h-8 w-8';
  switch (labelKey) {
    case 'homeMyTasks':
      return <IconClipboardCheck className={className} />;
    case 'homeMyKpi':
      return <IconChart className={className} />;
    case 'homeBroadcast':
      return <IconMegaphone className={className} />;
    case 'homeSupport':
      return <IconLifeBuoy className={className} />;
    case 'homeHrNotes':
      return <IconNotepad className={className} />;
    case 'homeTeam':
      return <IconUsers className={className} />;
    case 'homePhotoReview':
      return <IconCamera className={className} />;
    case 'homePhotoArchive':
      return <IconArchive className={className} />;
    case 'homeQcReports':
      return <IconDocument className={className} />;
  }
}

export function DashboardHomeContent({
  email,
  role,
  displayName,
  hrKpiReviewer = false,
  qcHome = false,
  kpiScore = null,
}: {
  email: string;
  role: string;
  displayName: string;
  hrKpiReviewer?: boolean;
  qcHome?: boolean;
  kpiScore?: number | null;
}) {
  const { t } = useLanguage();
  const tiles = getDashboardHomeTiles({ role, hrKpiReviewer, qcHome });
  const showSwipe = (role === 'owner' || role === 'manager') && tiles.length === 0;

  return (
    <div className="app-page space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-app-primary">
          <span className="font-semibold text-app-secondary">{t.dashboard.welcomeWord}</span>{' '}
          <span className="font-extrabold text-app-primary">{displayName}</span>
        </h1>
        <p className="text-lg font-semibold text-app-primary">
          {t.dashboard.yourKpi}{' '}
          <span className="tabular-nums">{kpiScore == null ? '—' : kpiScore.toFixed(0)}</span>
        </p>
        <p className="text-sm text-app-secondary">
          {tiles.length > 0
            ? t.dashboard.staffHomeHint
            : showSwipe
              ? t.photoReview.homeHint
              : interpolate(t.dashboard.welcomeMeta, { email, role })}
        </p>
      </header>

      {tiles.length > 0 ? (
        <section id="section-home-apps" className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="flex min-h-32 flex-col items-center justify-center gap-2.5 rounded-3xl border border-gray-200 bg-white px-3 py-5 text-center shadow-sm active:scale-[0.98] dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ios-blue/10 text-ios-blue">
                <HomeTileIcon labelKey={tile.labelKey} />
              </span>
              <span className="text-base font-extrabold leading-tight text-app-primary">{t.dashboard[tile.labelKey]}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {showSwipe ? <PhotoSwipeReview /> : null}
    </div>
  );
}
