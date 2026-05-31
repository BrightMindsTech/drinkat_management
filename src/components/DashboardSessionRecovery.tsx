'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Logo } from '@/components/Logo';

const MAX_BURST_ATTEMPTS = 15;
const RETRY_MS = 800;
const IDLE_RETRY_MS = 5000;

type SessionPayload = {
  user?: { email?: string | null };
  expires?: string;
};

async function fetchSession(): Promise<{ ok: boolean; hasUser: boolean; status: number }> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return { ok: false, hasUser: false, status: res.status };
    const data = (await res.json()) as SessionPayload;
    return { ok: true, hasUser: !!data?.user, status: res.status };
  } catch {
    return { ok: false, hasUser: false, status: 0 };
  }
}

/**
 * Retries session restore indefinitely — never auto-sends anyone to login.
 * Sign-in again is manual only (Sign out / explicit link).
 */
export function DashboardSessionRecovery() {
  const router = useRouter();
  const { t } = useLanguage();
  const [attempt, setAttempt] = useState(0);
  const [showManualSignIn, setShowManualSignIn] = useState(false);

  const tryRestore = useCallback(async (): Promise<boolean> => {
    for (let i = 0; i < MAX_BURST_ATTEMPTS; i++) {
      setAttempt((n) => n + 1);
      const result = await fetchSession();
      if (result.hasUser) {
        router.refresh();
        return true;
      }
      if (result.ok && !result.hasUser && i >= 6) {
        setShowManualSignIn(true);
        return false;
      }
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
    return false;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let idleTimer: number | null = null;

    const loop = async () => {
      while (!cancelled) {
        const restored = await tryRestore();
        if (cancelled || restored) return;
        await new Promise<void>((resolve) => {
          idleTimer = window.setTimeout(resolve, IDLE_RETRY_MS);
        });
      }
    };

    void loop();
    return () => {
      cancelled = true;
      if (idleTimer != null) window.clearTimeout(idleTimer);
    };
  }, [tryRestore]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-ios-gray dark:bg-ios-gray-dark safe-pt-top pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <Logo className="h-12 w-auto mb-6 opacity-90 animate-pulse" />
      <p className="text-app-label font-medium">{t.session.recoveryRestoring}</p>
      <p className="text-app-secondary text-sm mt-2">{t.session.recoveryAttempt.replace('{n}', String(attempt))}</p>
      {showManualSignIn ? (
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <p className="text-center text-app-secondary text-sm">{t.session.recoveryFailedBody}</p>
          <button
            type="button"
            onClick={() => void tryRestore()}
            className="w-full rounded-xl bg-ios-blue py-3 text-white font-semibold"
          >
            {t.session.recoveryRetry}
          </button>
          <a
            href="/login"
            className="w-full rounded-xl border border-gray-300 dark:border-ios-dark-separator py-3 text-center font-semibold text-app-label"
          >
            {t.session.recoverySignIn}
          </a>
        </div>
      ) : null}
    </div>
  );
}
