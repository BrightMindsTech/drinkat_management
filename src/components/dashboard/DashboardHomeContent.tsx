'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';
import { getDashboardShortcutDestinations, type DashboardNavItem } from '@/lib/dashboard-nav-config';

function IconBell({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClipboardCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
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
      <line x1="10" x2="8" y1="9" y2="9" />
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

function IconClock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconMessages({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function iconForShortcut(item: DashboardNavItem) {
  if (item.labelKey === 'notifications') return IconBell;
  if (item.labelKey === 'timeClock') return IconClock;
  if (item.labelKey === 'ratings') return IconStar;
  if (item.labelKey === 'messages') return IconMessages;
  if (item.labelKey === 'hr' || item.labelKey === 'myInfoAdvances') return IconUsers;
  if (item.labelKey === 'qc' || item.labelKey === 'qcSubmissions') return IconClipboardCheck;
  if (item.labelKey === 'forms') return IconDocument;
  if (item.labelKey === 'reports') return IconChart;
  if (item.labelKey === 'managerReports') return IconEye;
  return IconDocument;
}

function shortcutDescription(role: string, item: DashboardNavItem, t: LocaleMessages): string {
  switch (item.labelKey) {
    case 'hr':
      if (role === 'owner') return t.dashboard.hrDescOwner;
      if (role === 'manager') return t.dashboard.hrDescManager;
      return t.dashboard.hrDescStaff;
    case 'qc':
    case 'qcSubmissions':
      return role === 'staff' ? t.dashboard.qcDescSubmit : t.dashboard.qcDescReview;
    case 'forms':
      return t.dashboard.formsDesc;
    case 'reports':
      return t.dashboard.reportsDesc;
    case 'managerReports':
      return t.dashboard.shortcutManagerReports;
    case 'timeClock':
      return t.dashboard.shortcutTimeClock;
    case 'ratings':
      return t.dashboard.shortcutRatings;
    case 'messages':
      return t.dashboard.shortcutMessages;
    case 'myInfoAdvances':
      return t.dashboard.hrDescStaff;
    default:
      return '';
  }
}

type ReviewNotificationItem = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

type ReviewNotificationResponse = {
  total: number;
  items: ReviewNotificationItem[];
};

type TimeClockStatusResponse = {
  applicable?: boolean;
  employeeName?: string;
  clock?: { clockInAt?: string } | null;
  away?: { kind?: string; endsAt?: string } | null;
};

function formatShortDate(locale: 'en' | 'ar'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString();
  }
}

function formatTimeAgo(iso: string | undefined, locale: 'en' | 'ar', t: LocaleMessages): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return t.dashboard.activityJustNow;
  if (minutes < 60) return interpolate(t.dashboard.activityMinutesAgo, { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return interpolate(t.dashboard.activityHoursAgo, { count: hours });
  const days = Math.floor(hours / 24);
  return interpolate(t.dashboard.activityDaysAgo, { count: days });
}

export function DashboardHomeContent({
  email,
  role,
  displayName,
}: {
  email: string;
  role: string;
  displayName: string;
}) {
  const { t, locale } = useLanguage();
  const shortcuts = getDashboardShortcutDestinations(role);
  const [unreadCount, setUnreadCount] = useState(0);
  const [review, setReview] = useState<ReviewNotificationResponse>({ total: 0, items: [] });
  const [timeClockStatus, setTimeClockStatus] = useState<TimeClockStatusResponse | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const run = async () => {
      try {
        const [unreadRes, reviewRes, clockRes] = await Promise.all([
          fetch('/api/chat/unread', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/review-notifications', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/time-clock/status', { credentials: 'include', cache: 'no-store' }),
        ]);
        if (disposed) return;

        if (unreadRes.ok) {
          const data = (await unreadRes.json()) as { total?: number };
          setUnreadCount(Number(data.total ?? 0));
        }
        if (reviewRes.ok) {
          const data = (await reviewRes.json()) as ReviewNotificationResponse;
          setReview({
            total: Number(data.total ?? 0),
            items: Array.isArray(data.items) ? data.items : [],
          });
        }
        if (clockRes.ok) {
          const data = (await clockRes.json()) as TimeClockStatusResponse;
          setTimeClockStatus(data);
        }
        setLastUpdatedAt(new Date().toISOString());
      } catch {
        // Ignore dashboard widget polling errors to keep page responsive.
      }
    };

    void run();
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void run();
    }, 30_000);
    const onFocus = () => void run();
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const todayLabel = useMemo(() => formatShortDate(locale), [locale]);

  const statusChips = useMemo(() => {
    const chips: string[] = [];
    if (timeClockStatus?.applicable) {
      if (timeClockStatus.clock) {
        chips.push(t.dashboard.chipClockedIn);
      } else {
        chips.push(t.dashboard.chipClockedOut);
      }
      if (timeClockStatus.away) chips.push(t.dashboard.chipAwayTimer);
    }
    chips.push(
      unreadCount > 0
        ? interpolate(t.dashboard.chipUnreadMessages, { count: unreadCount })
        : t.dashboard.chipNoUnreadMessages
    );
    chips.push(
      review.total > 0
        ? interpolate(t.dashboard.chipPendingApprovals, { count: review.total })
        : t.dashboard.chipNoPendingApprovals
    );
    return chips;
  }, [review.total, t, timeClockStatus, unreadCount]);

  const activityRows = useMemo(() => {
    const rows: { id: string; text: string; muted?: boolean }[] = [];
    if (timeClockStatus?.applicable) {
      if (timeClockStatus.clock?.clockInAt) {
        const ago = formatTimeAgo(timeClockStatus.clock.clockInAt, locale, t);
        rows.push({
          id: 'clock-in',
          text: ago
            ? interpolate(t.dashboard.activityClockedInSince, { ago })
            : t.dashboard.activityClockedIn,
        });
      } else {
        rows.push({ id: 'clock-out', text: t.dashboard.activityNotClockedIn, muted: true });
      }
    }
    rows.push({
      id: 'messages',
      text:
        unreadCount > 0
          ? interpolate(t.dashboard.activityUnreadMessages, { count: unreadCount })
          : t.dashboard.activityNoUnreadMessages,
      muted: unreadCount === 0,
    });
    rows.push({
      id: 'reviews',
      text:
        review.total > 0
          ? interpolate(t.dashboard.activityPendingApprovals, { count: review.total })
          : t.dashboard.activityNoPendingApprovals,
      muted: review.total === 0,
    });
    if (lastUpdatedAt) {
      const ago = formatTimeAgo(lastUpdatedAt, locale, t) ?? t.dashboard.activityJustNow;
      rows.push({ id: 'updated', text: interpolate(t.dashboard.activityUpdatedAgo, { ago }), muted: true });
    }
    return rows.slice(0, 4);
  }, [lastUpdatedAt, locale, review.total, t, timeClockStatus, unreadCount]);

  return (
    <div className="app-page space-y-8">
      <section id="section-home-overview" className="scroll-mt-28 space-y-3">
        <p className="inline-flex items-center rounded-full border border-ios-blue/20 bg-ios-blue/10 px-3 py-1 text-xs font-semibold text-ios-blue">
          {t.dashboard.todayLabel}: {todayLabel}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-app-primary sm:text-4xl">
          <span className="font-semibold text-app-secondary">{t.dashboard.welcomeWord}</span>{' '}
          <span className="font-extrabold text-app-primary">{displayName}</span>
        </h1>
        <p className="text-sm text-app-secondary">{interpolate(t.dashboard.welcomeMeta, { email, role })}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {statusChips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-full border border-gray-200 dark:border-ios-dark-separator px-3 py-1 text-xs font-medium text-app-secondary bg-white dark:bg-ios-dark-elevated"
            >
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section id="section-home-attention" className="scroll-mt-28 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-app-primary">{t.dashboard.needsAttentionTitle}</h2>
          <p className="mt-1 text-sm text-app-muted">{t.dashboard.needsAttentionHint}</p>
        </div>
        {review.items.length > 0 ? (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {review.items.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="block rounded-ios-lg border border-amber-200/70 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-3 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <p className="text-sm font-semibold text-app-primary truncate">{item.title}</p>
                  {item.subtitle ? <p className="text-xs text-app-secondary mt-1 truncate">{item.subtitle}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-4 py-3 text-sm text-app-muted">
            {t.dashboard.needsAttentionEmpty}
          </div>
        )}
      </section>

      <section id="section-home-activity" className="scroll-mt-28 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-app-primary">{t.dashboard.activityTitle}</h2>
          <p className="mt-1 text-sm text-app-muted">{t.dashboard.activityHint}</p>
        </div>
        <ul className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated divide-y divide-gray-100 dark:divide-ios-dark-separator">
          {activityRows.map((row) => (
            <li key={row.id} className={`px-4 py-3 text-sm ${row.muted ? 'text-app-muted' : 'text-app-primary'}`}>
              {row.text}
            </li>
          ))}
        </ul>
      </section>

      <section id="section-home-apps" className="scroll-mt-28 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-app-primary">{t.dashboard.allTools}</h2>
          <p className="mt-1 text-sm text-app-muted">{t.dashboard.appsIntro}</p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          {shortcuts.map((item) => {
            const title = t.nav[item.labelKey];
            const desc = shortcutDescription(role, item, t);
            const Icon = iconForShortcut(item);
            const badge =
              item.labelKey === 'messages'
                ? unreadCount
                : item.labelKey === 'managerReports' || item.labelKey === 'hr' || item.labelKey === 'qc'
                  ? review.total
                  : 0;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[108px] flex-col justify-center rounded-ios-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-ios-blue/30 hover:bg-gray-50/80 active:scale-[0.99] dark:border-ios-dark-separator dark:bg-ios-dark-elevated dark:hover:bg-ios-dark-elevated-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ios-blue/10 text-ios-blue dark:bg-ios-blue/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-bold text-app-primary">{title}</span>
                    {badge > 0 ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  {desc ? <span className="mt-1.5 text-sm text-app-muted leading-snug">{desc}</span> : null}
                  <span className="mt-2 text-xs text-app-secondary">
                    {badge > 0
                      ? interpolate(t.dashboard.toolNeedsAttention, { count: badge })
                      : t.dashboard.toolNoPending}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
