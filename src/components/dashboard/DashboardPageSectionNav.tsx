'use client';

import { useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';
import { getPageSections } from '@/lib/dashboard-page-sections';
import { usePathname } from 'next/navigation';

function readLocalePath(t: LocaleMessages, path: string): string {
  const parts = path.split('.');
  let cur: unknown = t;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : path;
}

export function DashboardPageSectionNav({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const sections = useMemo(() => getPageSections(pathname, role), [pathname, role]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  if (sections.length === 0) {
    return <div className="h-[env(safe-area-inset-bottom)] shrink-0 bg-white/95 dark:bg-ios-dark-elevated/95 md:h-0" />;
  }

  return (
    <div className="shrink-0 border-t border-gray-200/90 dark:border-ios-dark-separator/80 bg-white/98 dark:bg-ios-dark-elevated/98 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <nav className="max-w-6xl mx-auto min-w-0 px-2 pt-2 pb-1" aria-label={t.dashboard.pageSectionsNavAria}>
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
          {t.dashboard.pageSectionsNavLabel}
        </p>
        <div className="flex flex-nowrap items-stretch gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] pb-1">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="shrink-0 max-w-[42vw] rounded-full border border-gray-200/90 bg-gray-50/90 px-3 py-2 text-center text-xs font-semibold text-app-primary shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-fill/80 dark:text-ios-dark-label sm:max-w-[11rem]"
            >
              <span className="line-clamp-2">{readLocalePath(t, s.labelRef)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
