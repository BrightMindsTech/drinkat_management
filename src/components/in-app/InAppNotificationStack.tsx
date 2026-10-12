'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { setForegroundInterval } from '@/lib/app-foreground';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

function InAppNotificationCard({
  id,
  title,
  body,
  actionLabel,
  onAction,
  href,
  content,
  onDismiss,
  onDismissed,
}: {
  id: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  content?: React.ReactNode;
  onDismiss: () => void;
  onDismissed?: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();

  function handlePrimaryAction() {
    onDismissed?.();
    if (onAction) {
      onAction();
      return;
    }
    if (href) {
      onDismiss();
      router.push(href);
    }
  }

  return (
    <div className="relative w-full" role="status">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-app-primary">{title}</p>
              {body ? <p className="mt-1 text-sm text-app-muted">{body}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                onDismissed?.();
                onDismiss();
              }}
              className="shrink-0 rounded-full px-2 py-1 text-sm font-bold text-app-muted"
              aria-label={t.common.close}
            >
              ×
            </button>
          </div>
          {content ? <div className="mt-2">{content}</div> : null}
          {(actionLabel && (onAction || href)) || href ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {actionLabel && (onAction || href) ? (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="rounded-full bg-ios-blue px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {actionLabel}
                </button>
              ) : null}
              {href && !actionLabel ? (
                <Link
                  href={href}
                  onClick={() => {
                    onDismissed?.();
                    onDismiss();
                  }}
                  className="rounded-full bg-ios-blue px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {t.common.goToPending}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

async function countUnfinishedWork(): Promise<number> {
  let n = 0;
  try {
    const res = await fetchWithRetry('/api/review-notifications', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as { total?: number };
      n += Math.max(0, Number(json.total) || 0);
    }
  } catch {
    /* non-blocking */
  }
  try {
    const res = await fetchWithRetry('/api/photo-checks/tasks', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as {
        required?: boolean;
        items?: { status: string; windowStartAt?: string; dueAt?: string }[];
      };
      if (json.required && Array.isArray(json.items)) {
        const now = Date.now();
        n += json.items.filter((row) => {
          if (row.status !== 'due' && row.status !== 'overdue' && row.status !== 'in_progress') return false;
          if (!row.windowStartAt || !row.dueAt) return false;
          const start = new Date(row.windowStartAt).getTime();
          const due = new Date(row.dueAt).getTime();
          return start <= now && now <= due;
        }).length;
      }
    }
  } catch {
    /* non-blocking */
  }
  return n;
}

export function InAppNotificationStack() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { entries, dismissedIds, dismiss } = useInAppNotifications();
  const [portalReady, setPortalReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [unfinished, setUnfinished] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const n = await countUnfinishedWork();
      if (mounted) setUnfinished(n);
    }
    const onWake = () => {
      if (document.visibilityState === 'visible') void load();
    };
    void load();
    const stop = setForegroundInterval(onWake, 15000);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener(APP_RESUME_EVENT, onWake);
    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && el.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open]);

  const visible = entries.filter((e) => !dismissedIds.has(e.id));
  const count = visible.length;
  const badge = count > 9 ? '9+' : String(count);
  const shake = !open && (count > 0 || unfinished > 0);
  const path = pathname ?? '';
  const aboveSectionNav = !path.startsWith('/dashboard/messages');
  const bottomClass = aboveSectionNav
    ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]';

  if (!portalReady) return null;

  return createPortal(
    <div
      ref={rootRef}
      className={`pointer-events-auto fixed right-4 z-[600] flex flex-col items-end gap-2 ${bottomClass}`}
    >
      {open ? (
        <div
          className="flex max-h-[min(60vh,28rem)] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          role="dialog"
          aria-label={t.common.inboxBell}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-ios-dark-separator">
            <p className="text-sm font-bold text-app-primary">{t.common.inboxBell}</p>
            <button type="button" className="text-sm font-semibold text-app-muted" onClick={() => setOpen(false)}>
              {t.common.close}
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {visible.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-app-muted">{t.common.inboxEmpty}</p>
            ) : (
              visible.map((entry) => (
                <InAppNotificationCard
                  key={entry.id}
                  {...entry}
                  onDismiss={() => dismiss(entry.id)}
                  onDismissed={entry.onDismissed}
                />
              ))
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-ios-blue text-white shadow-[0_8px_24px_rgba(0,122,255,0.35)]"
        aria-label={count > 0 ? `${t.common.inboxBell} ${badge}` : t.common.inboxBell}
        aria-expanded={open}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-6 w-6 ${shake ? 'bell-vibrate' : ''}`}
          aria-hidden
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </button>
    </div>,
    document.body
  );
}
