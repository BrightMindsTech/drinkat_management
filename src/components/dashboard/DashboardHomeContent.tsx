'use client';

import Link from 'next/link';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';
import { getDashboardShortcutDestinations, type DashboardNavItem } from '@/lib/dashboard-nav-config';

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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shortcuts.map((item) => {
            const title = t.nav[item.labelKey];
            const desc = shortcutDescription(role, item, t);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-[108px] flex-col justify-center rounded-ios-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-ios-blue/30 hover:bg-gray-50/80 active:scale-[0.99] dark:border-ios-dark-separator dark:bg-ios-dark-elevated dark:hover:bg-ios-dark-elevated-2"
                >
                  <span className="text-lg font-bold text-app-primary">{title}</span>
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
