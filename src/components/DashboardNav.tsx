'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { normalizeUserRole } from '@/lib/formVisibility';

const base = '/dashboard';

function IconHome({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
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

function navIconForHref(href: string) {
  if (href === base) return IconHome;
  if (href.includes('/time-clock')) return IconClock;
  if (href.includes('/hr')) return IconUsers;
  if (href.includes('/qc')) return IconClipboardCheck;
  if (href.includes('/forms')) return IconDocument;
  if (href.includes('/manager-reports')) return IconEye;
  if (href.includes('/reports')) return IconChart;
  return IconHome;
}

export function DashboardNav({ role, variant = 'top' }: { role: string; variant?: 'top' | 'bottom' }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const r = normalizeUserRole(role);

  const ownerLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/hr`, label: t.nav.hr },
    { href: `${base}/qc`, label: t.nav.qc },
    { href: `${base}/forms`, label: t.nav.forms },
    { href: `${base}/reports`, label: t.nav.reports },
    { href: `${base}/manager-reports`, label: t.nav.managerReports },
  ];
  const qcLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/time-clock`, label: t.nav.timeClock },
    { href: `${base}/qc`, label: t.nav.qc },
    { href: `${base}/forms`, label: t.nav.forms },
  ];
  const staffLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/time-clock`, label: t.nav.timeClock },
    { href: `${base}/hr`, label: t.nav.myInfoAdvances },
    { href: `${base}/qc`, label: t.nav.qcSubmissions },
    { href: `${base}/forms`, label: t.nav.forms },
  ];

  const managerLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/time-clock`, label: t.nav.timeClock },
    { href: `${base}/hr`, label: t.nav.hr },
    { href: `${base}/qc`, label: t.nav.qc },
    { href: `${base}/forms`, label: t.nav.forms },
  ];
  const marketingLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/time-clock`, label: t.nav.timeClock },
    { href: `${base}/hr`, label: t.nav.myInfoAdvances },
    { href: `${base}/forms`, label: t.nav.forms },
  ];

  const links =
    r === 'owner'
      ? ownerLinks
      : r === 'qc'
      ? qcLinks
      : r === 'manager'
      ? managerLinks
      : r === 'marketing'
      ? marketingLinks
      : staffLinks;

  const isBottom = variant === 'bottom';

  return (
    <nav
      className={
        isBottom
          ? 'max-w-3xl w-full min-w-0 mx-auto px-1 pt-1.5 pb-1'
          : 'max-w-3xl w-full min-w-0 mx-auto px-4 py-2'
      }
      aria-label="Dashboard"
    >
      <div
        className={
          isBottom
            ? 'flex flex-nowrap items-stretch justify-between gap-0.5 overflow-x-auto [-webkit-overflow-scrolling:touch]'
            : 'flex flex-wrap items-center justify-center gap-1'
        }
      >
        {links.map(({ href, label }, idx) => {
          const active = pathname === href || (href !== base && pathname.startsWith(href));
          const Icon = navIconForHref(href);

          return (
            <div key={href} className={`flex items-center shrink-0 ${isBottom ? 'min-w-0 flex-1' : ''}`}>
              <Link
                href={href}
                title={label}
                aria-label={label}
                className={`flex flex-col items-center justify-center w-full transition-colors app-hover-lift app-press ${
                  isBottom
                    ? 'min-h-[48px] px-1 py-2 rounded-ios gap-0.5'
                    : 'text-center text-sm font-medium px-4 py-2 shrink-0 rounded-ios'
                } ${
                  active
                    ? 'bg-ios-blue text-white'
                    : 'text-app-secondary hover:bg-gray-200 dark:hover:bg-ios-dark-elevated-2'
                }`}
              >
                {isBottom ? (
                  <>
                    {href.includes('/qc') ? (
                      <span
                        className={`font-bold tracking-wide shrink-0 leading-none tabular-nums ${
                          active ? '' : 'opacity-90'
                        }`}
                        style={{ fontSize: 24, lineHeight: 1 }}
                        aria-hidden
                      >
                        QC
                      </span>
                    ) : (
                      <Icon className={active ? 'w-6 h-6 shrink-0' : 'w-6 h-6 shrink-0 opacity-90'} />
                    )}
                    <span className="sr-only">{label}</span>
                  </>
                ) : (
                  label
                )}
              </Link>
              {!isBottom && idx < links.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-1.5 h-5 w-px bg-gray-300 dark:bg-ios-dark-separator"
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
