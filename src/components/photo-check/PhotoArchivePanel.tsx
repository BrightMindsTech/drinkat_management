'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';

type ArchiveItem = {
  id: string;
  status: string;
  submittedAt: string;
  uploadPaths: string[];
  employee: { name: string };
  branch: { name: string };
  type: { titleEn: string; titleAr: string } | null;
  task: { slotKey: string; periodKey: string } | null;
};

export function PhotoArchivePanel() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<ArchiveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/photo-checks/archive', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as { items?: ArchiveItem[]; error?: string };
        if (!res.ok) throw new Error(json.error || t.photoArchive.loadFailed);
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : []);
      })
      .catch(() => {
        if (!cancelled) setError(t.photoArchive.loadFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [t.photoArchive.loadFailed]);

  function statusLabel(status: string): string {
    if (status === 'approved') return t.photoCheck.approved;
    if (status === 'rejected' || status === 'ai_rejected') return t.photoCheck.rejected;
    return t.photoCheck.sentToQc;
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-app-primary">{t.photoArchive.title}</h1>
        <p className="mt-1 text-sm text-app-muted">{t.photoArchive.hint}</p>
      </header>
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {items == null && !error ? <p className="text-sm text-app-muted">{t.photoArchive.loading}</p> : null}
      {items && items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-app-muted dark:border-ios-dark-separator">
          {t.photoArchive.empty}
        </p>
      ) : null}
      <ul className="space-y-3">
        {(items ?? []).map((item) => {
          const title = locale === 'ar' ? item.type?.titleAr || item.type?.titleEn : item.type?.titleEn;
          return (
            <li
              key={item.id}
              className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-app-primary">{title || t.photoArchive.title}</p>
                  <p className="text-xs text-app-muted">
                    {item.employee.name} · {item.branch.name}
                    {item.task?.periodKey ? ` · ${item.task.periodKey}` : ''}
                  </p>
                </div>
                <p className="text-xs font-semibold text-app-secondary">{statusLabel(item.status)}</p>
              </div>
              <p className="mt-1 text-xs text-app-muted">{formatAppDateTime(item.submittedAt, locale)}</p>
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {item.uploadPaths.map((src) => (
                  <li key={src}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-28 w-full rounded-xl object-cover" />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
