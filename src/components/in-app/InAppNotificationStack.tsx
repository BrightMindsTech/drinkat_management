'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';

const DEFAULT_AUTO_DISMISS_MS = 10_000;

function InAppNotificationCard({
  id,
  title,
  body,
  persistent,
  autoDismissMs,
  minimizable,
  minimizedLabel,
  actionLabel,
  onAction,
  href,
  content,
  minimized,
  onMinimize,
  onDismiss,
  onDismissed,
}: {
  id: string;
  title: string;
  body?: string;
  persistent?: boolean;
  autoDismissMs?: number;
  minimizable?: boolean;
  minimizedLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  content?: React.ReactNode;
  minimized: boolean;
  onMinimize: (minimized: boolean) => void;
  onDismiss: () => void;
  onDismissed?: () => void;
}) {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const dismissedRef = useRef(false);
  const duration = persistent ? 0 : (autoDismissMs ?? DEFAULT_AUTO_DISMISS_MS);

  useEffect(() => {
    if (persistent || duration <= 0) return;
    dismissedRef.current = false;
    const timer = window.setTimeout(() => {
      if (!dismissedRef.current) onDismiss();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [persistent, duration, onDismiss, id]);

  function acknowledgeDismiss() {
    dismissedRef.current = true;
    onDismissed?.();
    onDismiss();
  }

  if (minimized && minimizable) {
    return (
      <button
        type="button"
        onClick={() => onMinimize(false)}
        className="pointer-events-auto w-full max-w-[18rem] rounded-ios border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-ios-dark-elevated px-3 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-md app-animate-in text-start"
      >
        {minimizedLabel ?? title}
      </button>
    );
  }

  function handlePrimaryAction() {
    dismissedRef.current = true;
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
    <div className="pointer-events-auto relative w-full max-w-[18rem]" role="status" aria-live="polite">
      <div className="overflow-hidden rounded-ios-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-ios-dark-elevated shadow-lg app-animate-in">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-amber-900 dark:text-amber-200">{title}</p>
              {body ? <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{body}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {minimizable ? (
                <button
                  type="button"
                  onClick={() => {
                    onDismissed?.();
                    onMinimize(true);
                  }}
                  className="rounded-ios border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-ios-dark-elevated-2 px-2 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-ios-dark-fill"
                >
                  {t.common.hide}
                </button>
              ) : null}
              <button
                type="button"
                onClick={acknowledgeDismiss}
                className="rounded-ios border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-ios-dark-elevated-2 px-2 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-ios-dark-fill"
                aria-label={t.common.close}
              >
                ×
              </button>
            </div>
          </div>
          {content ? <div className="mt-3">{content}</div> : null}
          {(actionLabel && (onAction || href)) || href ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {actionLabel && (onAction || href) ? (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="rounded-ios border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-ios-dark-elevated-2 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-ios-dark-fill"
                >
                  {actionLabel}
                </button>
              ) : null}
              {href && !actionLabel ? (
                <Link
                  href={href}
                  onClick={() => {
                    dismissedRef.current = true;
                    onDismissed?.();
                    onDismiss();
                  }}
                  className="rounded-ios border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-ios-dark-elevated-2 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-ios-dark-fill"
                >
                  {t.common.goToPending}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {!persistent && duration > 0 ? (
          <div className="h-1 bg-amber-200 dark:bg-amber-800" aria-hidden>
            <div
              key={`${id}-${duration}`}
              className="in-app-notif-timer-bar h-full bg-amber-500 dark:bg-amber-400"
              style={{
                animationDuration: `${duration}ms`,
                transformOrigin: dir === 'rtl' ? 'right' : 'left',
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InAppNotificationStack() {
  const pathname = usePathname();
  const { entries, minimizedIds, dismissedIds, dismiss, setMinimized } = useInAppNotifications();
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const visible = entries.filter((e) => !dismissedIds.has(e.id));
  if (!portalReady || visible.length === 0) return null;

  const path = pathname ?? '';
  const isMessagesPage = path.startsWith('/dashboard/messages');
  const positionClass = isMessagesPage
    ? 'top-[calc(9rem+env(safe-area-inset-top))] sm:top-[calc(6.5rem+env(safe-area-inset-top))]'
    : 'top-[calc(5.5rem+env(safe-area-inset-top))] sm:top-[calc(5rem+env(safe-area-inset-top))]';

  return createPortal(
    <div
      className={`pointer-events-none fixed end-3 z-[600] flex w-[min(18rem,88vw)] flex-col gap-2 ${positionClass}`}
      aria-label="Notifications"
    >
      {visible.map((entry) => (
        <InAppNotificationCard
          key={entry.id}
          {...entry}
          minimized={minimizedIds.has(entry.id)}
          onMinimize={(m) => setMinimized(entry.id, m)}
          onDismiss={() => dismiss(entry.id)}
          onDismissed={entry.onDismissed}
        />
      ))}
    </div>,
    document.body
  );
}
