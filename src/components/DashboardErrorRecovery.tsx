'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOptionalLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/Logo';

type Props = {
  /** Next.js error boundary reset (re-render server components). */
  onRetry?: () => void;
  digest?: string;
};

/** Friendly recovery when a dashboard server render fails (replaces the white Application error screen). */
export function DashboardErrorRecovery({ onRetry, digest }: Props) {
  const router = useRouter();
  const { t, dir } = useOptionalLanguage();

  useEffect(() => {
    // Auto-retry once — many failures are transient Cloudflare/D1 blips.
    const id = window.setTimeout(() => {
      if (onRetry) onRetry();
      else router.refresh();
    }, 1200);
    return () => window.clearTimeout(id);
  }, [onRetry, router]);

  const retry = () => {
    if (onRetry) onRetry();
    else router.refresh();
  };

  return (
    <div
      dir={dir}
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-ios-gray dark:bg-ios-gray-dark safe-pt-top pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex flex-col items-center shrink-0 mb-6">
        <Logo size={22} showPoweredBy={false} compact className="opacity-90" />
      </div>
      <div className="flex flex-col items-center gap-2 w-full max-w-sm">
        <p className="text-center text-app-label font-semibold text-lg leading-snug">{t.dashboard.errorTitle}</p>
        <p className="text-center text-app-secondary text-sm leading-relaxed">{t.dashboard.errorBody}</p>
        {digest ? (
          <p className="text-center text-app-secondary text-xs mt-1 opacity-60 font-mono">{digest}</p>
        ) : null}
      </div>
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
    </div>
  );
}
