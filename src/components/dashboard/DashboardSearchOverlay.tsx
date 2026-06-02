'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';
import { getDashboardNavItems } from '@/lib/dashboard-nav-config';
import { getPageSections } from '@/lib/dashboard-page-sections';

type SearchItem = {
  id: string;
  href: string;
  titleRef: string;
  keywords: string[];
};

function readLocalePath(t: LocaleMessages, path: string): string {
  const parts = path.split('.');
  let cur: unknown = t;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : path;
}

const PAGE_PATHS = [
  '/dashboard',
  '/dashboard/time-clock',
  '/dashboard/messages',
  '/dashboard/hr',
  '/dashboard/forms',
  '/dashboard/qc',
  '/dashboard/ratings',
  '/dashboard/manager-reports',
  '/dashboard/reports',
] as const;

const STATIC_KEYWORDS: Record<string, string[]> = {
  '/dashboard': ['home', 'dashboard', 'overview'],
  '/dashboard/time-clock': ['time', 'clock', 'attendance', 'shift', 'away', 'punch'],
  '/dashboard/messages': ['chat', 'messages', 'inbox', 'thread'],
  '/dashboard/hr': ['hr', 'employees', 'leave', 'advance', 'salary'],
  '/dashboard/forms': ['forms', 'submissions', 'checkup', 'template'],
  '/dashboard/qc': ['qc', 'quality', 'checklist', 'review'],
  '/dashboard/ratings': ['ratings', 'weekly', 'score'],
  '/dashboard/manager-reports': ['manager', 'reports', 'alerts'],
  '/dashboard/reports': ['reports', 'analytics', 'charts'],
  'hr-owner-advances': ['advance', 'loan', 'salary advance', 'team advance'],
  'hr-owner-leave': ['leave', 'vacation', 'time off'],
  'hr-owner-staff': ['staff', 'employee', 'workers'],
  'hr-owner-live-attendance': ['live', 'attendance', 'clocked in'],
  'section-home-apps': ['tools', 'apps', 'features'],
  'section-home-attention': ['attention', 'tasks', 'pending'],
  'section-home-activity': ['activity', 'recent', 'updates'],
};

function buildSearchItems(role: string): SearchItem[] {
  const fromNav = getDashboardNavItems(role).map((item) => ({
    id: `nav:${item.href}`,
    href: item.href,
    titleRef: `nav.${item.labelKey}`,
    keywords: STATIC_KEYWORDS[item.href] ?? [],
  }));

  const fromSections: SearchItem[] = [];
  for (const path of PAGE_PATHS) {
    const sections = getPageSections(path, role);
    for (const section of sections) {
      fromSections.push({
        id: `section:${path}#${section.id}`,
        href: `${path}#${section.id}`,
        titleRef: section.labelRef,
        keywords: STATIC_KEYWORDS[section.id] ?? [],
      });
    }
  }

  const dedup = new Map<string, SearchItem>();
  for (const item of [...fromNav, ...fromSections]) {
    if (!dedup.has(item.href)) dedup.set(item.href, item);
  }
  return Array.from(dedup.values());
}

export function DashboardSearchOverlay({
  role,
  open,
  onClose,
}: {
  role: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const items = useMemo(() => buildSearchItems(role), [role]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .map((item) => {
        const title = readLocalePath(t, item.titleRef).toLowerCase();
        const keywords = item.keywords.join(' ').toLowerCase();
        const href = item.href.toLowerCase();
        const score = Number(title.includes(q)) * 4 + Number(keywords.includes(q)) * 2 + Number(href.includes(q));
        return { item, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.item);
  }, [items, query, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160]">
      <button
        type="button"
        aria-label={t.dashboard.searchClose}
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
      />
      <div className="relative mx-auto mt-[max(12dvh,4.5rem)] w-[min(92vw,42rem)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 dark:border-ios-dark-separator">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.searchPlaceholder}
              className="w-full rounded-full border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill px-4 py-2 text-[16px] sm:text-sm outline-none focus:border-ios-blue"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-ios-dark-separator px-3 py-2 text-xs font-semibold text-app-secondary"
            >
              {t.common.cancel}
            </button>
          </div>

          <div className="max-h-[52dvh] overflow-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-app-muted">{t.dashboard.searchNoResults}</p>
            ) : (
              <ul className="space-y-1">
                {results.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="block rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-ios-dark-fill"
                    >
                      <p className="text-sm font-semibold text-app-primary">{readLocalePath(t, item.titleRef)}</p>
                      <p className="text-xs text-app-muted mt-0.5">{item.href}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
