'use client';

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

export function DashboardHomeContent({ email, role }: { email: string; role: string }) {
  const { t } = useLanguage();
  const shortcuts = getDashboardShortcutDestinations(role);

  return (
    <div className="app-page space-y-10">
      <section id="section-home-overview" className="scroll-mt-28 space-y-2">
        <h1 className="text-2xl font-bold text-app-primary">{t.dashboard.title}</h1>
        <p className="text-sm text-app-secondary">{interpolate(t.dashboard.welcome, { email, role })}</p>
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
                  </span>
                  {desc ? <span className="mt-1.5 text-sm text-app-muted leading-snug">{desc}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
