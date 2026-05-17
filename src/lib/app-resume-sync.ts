'use client';

import { ensurePushRegistered } from '@/lib/push-registration-client';
import { isCapacitorIos, setupNativePushDelivery } from '@/lib/native-push-client';

/** Fired after login resume: refresh badges, review queue, chat, time clock. */
export const APP_RESUME_EVENT = 'drinkat:app-resume';

let resumeInFlight: Promise<void> | null = null;

export async function runAppResumeSync(): Promise<void> {
  if (resumeInFlight) return resumeInFlight;
  resumeInFlight = (async () => {
    if (isCapacitorIos()) {
      await setupNativePushDelivery();
    }
    await ensurePushRegistered({ requestPermission: false });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(APP_RESUME_EVENT));
    }
  })().finally(() => {
    resumeInFlight = null;
  });
  return resumeInFlight;
}

/** Re-sync push + notify UI when app returns to foreground (browser or Capacitor iOS). */
export function bindAppResumeSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onVisible = () => {
    if (document.visibilityState === 'visible') void runAppResumeSync();
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
        if (isActive) void runAppResumeSync();
      });
      removeAppListener = () => {
        void handle.remove();
      };
    } catch {
      /* plugin optional */
    }
  })();

  void runAppResumeSync();

  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('pageshow', onVisible);
    removeAppListener?.();
  };
}
