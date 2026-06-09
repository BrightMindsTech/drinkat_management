'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalLanguage, interpolate } from '@/contexts/LanguageContext';
import { Logo } from '@/components/Logo';
import {
  DASH_AUTO_RETRY_MAX,
  bumpDashboardAutoRetry,
  dashboardAutoRetryCount,
  dashboardAutoRetryDelayMs,
} from '@/lib/dashboard-auto-retry';

type Props = {
  /** Next.js error boundary reset (re-render server components). */
  onRetry?: () => void;
  digest?: string;
};

/** Friendly recovery when a dashboard server render fails (replaces the white Application error screen). */
export function DashboardErrorRecovery({ onRetry, digest }: Props) {
  const router = useRouter();
  const { t, dir } = useOptionalLanguage();
  const [autoAttempt, setAutoAttempt] = useState(0);
  const scheduledRef = useRef(false);

  const retry = useCallback(() => {
    if (onRetry) onRetry();
    else router.refresh();
  }, [onRetry, router]);

  useEffect(() => {
    if (scheduledRef.current) return;
    const prior = dashboardAutoRetryCount();
    if (prior >= DASH_AUTO_RETRY_MAX) return;

    scheduledRef.current = true;
    const next = bumpDashboardAutoRetry();
    if (next === 0) return;

    setAutoAttempt(next);
    const delay = dashboardAutoRetryDelayMs(next);
    const id = window.setTimeout(() => {
      retry();
    }, delay);
    return () => window.clearTimeout(id);
  }, [retry]);

  const autoRetrying = autoAttempt > 0;
  const exhausted = !autoRetrying && dashboardAutoRetryCount() >= DASH_AUTO_RETRY_MAX;

  return (
    <div
      dir={dir}
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-ios-gray dark:bg-ios-gray-dark safe-pt-top pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex flex-col items-center shrink-0 mb-6">
        <Logo size={22} showPoweredBy={false} compact className="opacity-90" />
      </div>
      <div className="flex flex-col items-center gap-2 w-full max-w-sm">
        <p className="text-center text-app-label font-semibold text-lg leading-snug">
          {autoRetrying ? t.dashboard.errorRetryingTitle : t.dashboard.errorTitle}
        </p>
        <p className="text-center text-app-secondary text-sm leading-relaxed">
          {autoRetrying
            ? interpolate(t.dashboard.errorRetryingBody, {
                attempt: String(autoAttempt),
                max: String(DASH_AUTO_RETRY_MAX),
              })
            : t.dashboard.errorBody}
        </p>
        {digest && !autoRetrying ? (
          <p className="text-center text-app-secondary text-xs mt-1 opacity-60 font-mono">{digest}</p>
        ) : null}
        {exhausted ? (
          <p className="text-center text-app-secondary text-xs mt-1">{t.dashboard.errorRetryExhausted}</p>
        ) : null}
      </div>
      {!autoRetrying ? (
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={retry}
            className="w-full rounded-xl bg-ios-blue py-3 text-white font-semibold"
          >
            {t.dashboard.errorRetry}
          </button>
          <a
            href="/dashboard"
            className="w-full rounded-xl border border-gray-300 dark:border-ios-dark-separator py-3 text-center font-semibold text-app-label"
          >
            {t.dashboard.errorGoHome}
          </a>
        </div>
      ) : (
        <div className="mt-8 flex justify-center" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
        </div>
      )}
    </div>
  );
}
