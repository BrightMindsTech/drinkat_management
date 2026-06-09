'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { fetchAuthSession } from '@/lib/auth-session-client';

const API_UNAUTHORIZED = 'drinkat:api-unauthorized';
const RECOVER_ATTEMPTS = 8;
const RECOVER_MS = 600;

async function sessionStillValid(): Promise<boolean> {
  const result = await fetchAuthSession();
  return result.hasUser;
}

async function recoverSession(router: ReturnType<typeof useRouter>): Promise<boolean> {
  for (let i = 0; i < RECOVER_ATTEMPTS; i++) {
    if (await sessionStillValid()) {
      const now = Date.now();
      if (now - lastSessionRefreshAt >= MIN_SESSION_REFRESH_MS) {
        lastSessionRefreshAt = now;
        router.refresh();
      }
      return true;
    }
    await new Promise((r) => setTimeout(r, RECOVER_MS));
  }
  return false;
}

let lastSessionRefreshAt = 0;
const MIN_SESSION_REFRESH_MS = 30_000;

/**
 * Soft recovery when an API returns 401 but the session cookie may still be valid
 * (transient Worker/edge blip). Never navigates to /login automatically.
 */
export function SessionStabilityGuard() {
  const router = useRouter();

  useEffect(() => {
    let recovering = false;

    const onUnauthorized = () => {
      if (recovering) return;
      recovering = true;
      void recoverSession(router).finally(() => {
        recovering = false;
      });
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      if (
        res.status === 401 &&
        url.includes('/api/') &&
        !url.includes('/api/auth/') &&
        !url.includes('/api/health/')
      ) {
        window.dispatchEvent(new CustomEvent(API_UNAUTHORIZED));
      }
      return res;
    };

    window.addEventListener(API_UNAUTHORIZED, onUnauthorized);
    const onResume = () => {
      void sessionStillValid().then((ok) => {
        if (!ok) onUnauthorized();
      });
    };
    window.addEventListener(APP_RESUME_EVENT, onResume);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener(API_UNAUTHORIZED, onUnauthorized);
      window.removeEventListener(APP_RESUME_EVENT, onResume);
    };
  }, [router]);

  return null;
}
