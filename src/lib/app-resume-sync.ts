'use client';

import { bindPushRegistrationKeepalive } from '@/lib/push-registration-client';
import { isCapacitorIos, setupNativePushDelivery } from '@/lib/native-push-client';

/** Fired after login resume: refresh badges, review queue, chat, time clock. */
export const APP_RESUME_EVENT = 'drinkat:app-resume';

/** UI: show / hide the reconnecting banner. */
export const APP_RECONNECT_START = 'drinkat:reconnect-start';
export const APP_RECONNECT_DONE = 'drinkat:reconnect-done';

const MIN_RECONNECT_VISIBLE_MS = 600;

let resumeInFlight: Promise<void> | null = null;

export type RunAppResumeSyncOptions = {
  /** Reload dashboard server components (Next.js RSC refresh). */
  refreshServerUi?: () => void;
  /** When false, skip router.refresh — client polls still run via APP_RESUME_EVENT. */
  refreshServer?: boolean;
};

const MIN_SERVER_REFRESH_GAP_MS = 45_000;
const MIN_BACKGROUND_FOR_REFRESH_MS = 20_000;

let lastServerRefreshAt = 0;
let backgroundSince: number | null = null;

function shouldRunServerRefresh(): boolean {
  const now = Date.now();
  if (now - lastServerRefreshAt < MIN_SERVER_REFRESH_GAP_MS) return false;
  lastServerRefreshAt = now;
  return true;
}

async function pingSession(): Promise<void> {
  try {
    const { fetchWithAuthSessionRetry } = await import('@/lib/auth-session-client');
    await fetchWithAuthSessionRetry('/api/auth/session', { credentials: 'include', cache: 'no-store' });
  } catch {
    /* non-fatal */
  }
}

/** Real reconnect: session ping, push register, optional server refresh, then wake client polls. */
export async function runAppResumeSync(opts: RunAppResumeSyncOptions = {}): Promise<void> {
  if (resumeInFlight) return resumeInFlight;
  const startedAt = Date.now();
  const shouldRefreshServer = opts.refreshServer !== false && !!opts.refreshServerUi;

  resumeInFlight = (async () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(APP_RECONNECT_START));
    }
    try {
      await pingSession();
      if (isCapacitorIos()) {
        await setupNativePushDelivery();
      }
      // Never block resume/navigation on push — D1 blips on /api/push/register must not freeze the UI.
      void import('@/lib/push-registration-client').then(async ({ needsPushPermissionPrompt, ensurePushRegistered }) => {
        const requestPermission = await needsPushPermissionPrompt();
        void ensurePushRegistered({ requestPermission });
      });
      if (shouldRefreshServer) {
        opts.refreshServerUi?.();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(APP_RESUME_EVENT));
      }
    } catch {
      /* still hide banner below */
    } finally {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_RECONNECT_VISIBLE_MS - elapsed);
      if (wait > 0) {
        await new Promise((r) => setTimeout(r, wait));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(APP_RECONNECT_DONE));
      }
    }
  })().finally(() => {
    resumeInFlight = null;
  });

  return resumeInFlight;
}

/** Re-sync push + notify UI when app returns to foreground (browser or Capacitor iOS). */
export function bindAppResumeSync(refreshServerUi?: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const sync = (opts: { refreshServer?: boolean } = {}) => {
    const refreshServer =
      opts.refreshServer === true && refreshServerUi != null && shouldRunServerRefresh();
    void runAppResumeSync({ refreshServerUi, refreshServer });
  };

  const onVisible = () => {
    if (document.visibilityState === 'hidden') {
      backgroundSince = Date.now();
      return;
    }
    const bgMs = backgroundSince != null ? Date.now() - backgroundSince : 0;
    backgroundSince = null;
    const longBackground = bgMs >= MIN_BACKGROUND_FOR_REFRESH_MS;
    sync({ refreshServer: longBackground });
  };

  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('pageshow', onVisible);

  let removeAppListener: (() => void) | undefined;
  void (async () => {
    if (!isCapacitorIos()) return;
    try {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          backgroundSince = Date.now();
          return;
        }
        const bgMs = backgroundSince != null ? Date.now() - backgroundSince : 0;
        backgroundSince = null;
        sync({ refreshServer: bgMs >= MIN_BACKGROUND_FOR_REFRESH_MS });
      });
      removeAppListener = () => {
        void handle.remove();
      };
    } catch {
      /* plugin optional */
    }
  })();

  // Defer cold-open sync so NextAuth / SSR session is not raced on hard refresh.
  const coldOpenTimer = window.setTimeout(() => {
    sync({ refreshServer: false });
  }, 2_500);

  const stopPushKeepalive = bindPushRegistrationKeepalive();

  return () => {
    window.clearTimeout(coldOpenTimer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('pageshow', onVisible);
    removeAppListener?.();
    stopPushKeepalive();
  };
}
