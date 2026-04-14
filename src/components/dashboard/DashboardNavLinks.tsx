'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDashboardNavItems, isNavActive, type DashboardNavItem } from '@/lib/dashboard-nav-config';
import { usePathname } from 'next/navigation';

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

const base = '/dashboard';

function iconForItem(item: DashboardNavItem) {
  const { href } = item;
  if (href === base) return IconHome;
  if (href.includes('/time-clock')) return IconClock;
  if (href.includes('/hr')) return IconUsers;
  if (href.includes('/qc')) return IconClipboardCheck;
  if (href.includes('/forms')) return IconDocument;
  if (href.includes('/manager-reports')) return IconEye;
  if (href.includes('/reports')) return IconChart;
  if (href.includes('/ratings')) return IconStar;
  if (href.includes('/messages')) return IconMessages;
  return IconHome;
}

export function DashboardNavLinks({
  role,
  layout,
  onNavigate,
  className = '',
}: {
  role: string;
  layout: 'sidebar' | 'drawer';
  onNavigate?: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const items = getDashboardNavItems(role);

  const isDrawer = layout === 'drawer';

  return (
    <nav className={className} aria-label="Dashboard">
      <ul className={isDrawer ? 'flex flex-col gap-0.5 p-2' : 'flex flex-col gap-0.5 p-2'}>
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = iconForItem(item);
          const label = t.nav[item.labelKey];

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => onNavigate?.()}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors app-press ${
                  active
                    ? 'bg-ios-blue text-white shadow-sm'
                    : 'text-app-primary hover:bg-gray-100 dark:hover:bg-ios-dark-fill'
                } ${isDrawer ? 'min-h-[48px]' : ''}`}
              >
                {item.href.includes('/qc') ? (
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold leading-none tabular-nums ${
                      active ? 'bg-white/20 text-white' : 'bg-ios-blue/10 text-ios-blue dark:bg-ios-blue/20 dark:text-ios-blue'
                    }`}
                    style={{ fontSize: 13 }}
                    aria-hidden
                  >
                    QC
                  </span>
                ) : (
                  <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-ios-blue opacity-90'}`} />
                )}
                <span className="min-w-0 flex-1 truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
