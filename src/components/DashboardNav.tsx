'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { normalizeUserRole } from '@/lib/formVisibility';

export function DashboardNav({ role }: { role: string }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const base = '/dashboard';
  const r = normalizeUserRole(role);

  const ownerLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/hr`, label: t.nav.hr },
    { href: `${base}/qc`, label: t.nav.qc },
    { href: `${base}/forms`, label: t.nav.forms },
    { href: `${base}/reports`, label: t.nav.reports },
  ];
  const qcLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/qc`, label: t.nav.qc },
    { href: `${base}/forms`, label: t.nav.forms },
  ];
  const staffLinks = [
    { href: base, label: t.nav.home },
    { href: `${base}/hr`, label: t.nav.myInfoAdvances },
    { href: `${base}/qc`, label: t.nav.qcSubmissions },
    { href: `${base}/forms`, label: t.nav.forms },
  ];

  const links = r === 'owner' ? ownerLinks : r === 'qc' ? qcLinks : staffLinks;

  return (
    <nav className="max-w-3xl w-full min-w-0 mx-auto px-4 py-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
      {links.map(({ href, label }, idx) => (
        <div key={href} className="flex items-center shrink-0">
          <Link
            href={href}
            className={`px-4 py-2 text-sm font-medium rounded-ios shrink-0 transition-colors app-hover-lift app-press ${
              pathname === href || (href !== base && pathname.startsWith(href))
                ? 'bg-ios-blue text-white'
                : 'text-app-secondary hover:bg-gray-200 dark:hover:bg-ios-dark-elevated-2'
            }`}
          >
            {label}
          </Link>
          {idx < links.length - 1 && (
            <span
              aria-hidden="true"
              className="mx-1.5 h-5 w-px bg-gray-300 dark:bg-ios-dark-separator"
            />
          )}
        </div>
      ))}
      </div>
    </nav>
  );
}
