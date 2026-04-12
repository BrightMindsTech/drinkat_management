'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';

type PendingItem = {
  id: string;
  type: 'qc_review' | 'forms_review' | 'staff_qc_submit' | 'leave_review' | 'advance_review';
  title: string;
  subtitle?: string;
  href: string;
};
type PendingPayload = { total: number; items: PendingItem[] };

export function PendingReviewNotice({ role }: { role: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<PendingPayload | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [flyingId, setFlyingId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (role !== 'owner' && role !== 'qc' && role !== 'staff' && role !== 'manager' && role !== 'marketing') return;

    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/review-notifications', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as PendingPayload;
        if (!mounted) return;
        setData(json);
        // Keep dismissed-on-click behavior session-local only.
        setRemovedIds((prev) => prev.filter((id) => json.items.some((item) => item.id === id)));
      } catch {
        // keep silent; this is a non-blocking enhancement
      }
    }

    load();
    const id = window.setInterval(load, 20000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [role]);

  if (!data || data.total === 0) return null;

  const isStaff = role === 'staff' || role === 'marketing';
  const visibleItems = data.items.filter((item) => !removedIds.includes(item.id));
  if (visibleItems.length === 0) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed top-[calc(7rem+env(safe-area-inset-top))] end-2 z-[90] rounded-ios border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-md app-animate-in"
      >
        {visibleItems.length} {isStaff ? t.common.pendingSubmitTitle : t.common.pendingReviewTitle}
      </button>
    );
  }

  function handleOpen(item: PendingItem) {
    setFlyingId(item.id);
    window.setTimeout(() => {
      setRemovedIds((prev) => [...prev, item.id]);
      setFlyingId(null);
      router.push(item.href);
    }, 220);
  }

  return (
    <div className="fixed top-[calc(6rem+env(safe-area-inset-top))] end-4 z-[90] w-[min(92vw,420px)] rounded-ios-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/25 p-4 shadow-lg app-animate-in">
      <div className="flex items-start justify-between gap-2">
        <div>
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          {isStaff ? t.common.pendingSubmitTitle : t.common.pendingReviewTitle}
        </p>
        <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
          {interpolate(isStaff ? t.common.pendingSubmitBody : t.common.pendingReviewBody, { count: String(visibleItems.length) })}
        </p>
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="rounded-ios border border-amber-300/70 dark:border-amber-500/40 px-2 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
        >
          {t.common.hide}
        </button>
      </div>

      <div className="mt-3 space-y-2 max-h-64 overflow-auto pe-1">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleOpen(item)}
            className={`w-full rounded-ios border border-amber-300/70 dark:border-amber-500/40 bg-white/70 dark:bg-amber-950/30 px-3 py-2 text-start text-sm text-app-primary hover:bg-white dark:hover:bg-amber-950/45 app-press ${flyingId === item.id ? 'notif-fly-away' : ''}`}
          >
            {item.type === 'leave_review' && <div className="text-xs text-app-secondary mb-0.5">{t.hr.leaveRequests}</div>}
            {item.type === 'advance_review' && <div className="text-xs text-app-secondary mb-0.5">{t.hr.advances}</div>}
            <span className="font-semibold">{item.title}</span>
            {item.subtitle ? <span className="text-app-secondary ms-1">· {item.subtitle}</span> : null}
            <div className="text-app-secondary mt-0.5">{t.common.goToPending}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

