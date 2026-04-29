'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_TRIGGER, attachPullToRefresh } from '@/lib/attach-pull-to-refresh';

/**
 * Dashboard main scroll area with pull-to-refresh (touch).
 * Revalidates server components via `router.refresh()` when the user pulls down from the top.
 */
export function DashboardScrollMain({
  children,
  disableScroll = false,
}: {
  children: React.ReactNode;
  disableScroll?: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullPx, setPullPx] = useState(0);
  const [isPending, startTransition] = useTransition();

  const runRefresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (disableScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    return attachPullToRefresh(el, runRefresh, {
      canRefresh: () => !isPending,
      onPullChange: setPullPx,
    });
  }, [disableScroll, isPending, runRefresh]);

  const showBar = !disableScroll && (pullPx > 4 || isPending);
  const progress = isPending ? 1 : Math.min(1, pullPx / DEFAULT_TRIGGER);

  return (
    <main className="app-animate-in mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className={`relative min-h-0 flex-1 overflow-x-hidden ${
          disableScroll
            ? 'overflow-hidden overscroll-none px-0 py-0'
            : 'overflow-y-auto overscroll-contain px-3 py-5 sm:px-4 sm:py-6'
        }`}
        style={{ touchAction: disableScroll ? 'none' : 'pan-y' }}
      >
        <div
          className="pointer-events-none sticky top-0 z-[5] -mx-3 -mt-5 mb-1 flex h-0 justify-center sm:-mx-4 sm:-mt-6"
          aria-live="polite"
        >
          {showBar ? (
            <div
              className="flex h-9 items-center justify-center gap-2 rounded-full border border-gray-200/90 bg-white/95 px-3 text-xs font-semibold text-ios-blue shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated/95 dark:text-ios-blue"
              style={{
                transform: `translateY(${isPending ? 8 : Math.min(8 + pullPx * 0.35, 40)}px)`,
                opacity: 0.35 + progress * 0.65,
              }}
            >
              {isPending ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-ios-blue border-t-transparent"
                    aria-hidden
                  />
                  <span>{t.dashboard.pullToRefreshRefreshing}</span>
                </>
              ) : pullPx >= DEFAULT_TRIGGER * 0.85 ? (
                <span>{t.dashboard.pullToRefreshRelease}</span>
              ) : (
                <span>{t.dashboard.pullToRefreshHint}</span>
              )}
            </div>
          ) : null}
        </div>

        <div
          className={`will-change-transform ${disableScroll ? 'h-full min-h-0' : ''}`}
          style={{
            transform: pullPx > 0 && !isPending ? `translateY(${pullPx * 0.25}px)` : undefined,
            transition: pullPx === 0 && !isPending ? 'transform 0.2s ease-out' : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
