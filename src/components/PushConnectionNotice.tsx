'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLanguage } from '@/contexts/LanguageContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { reportPushDiagnostic } from '@/lib/native-push-client';
import {
  dismissPushBanner,
  ensurePushRegistered,
  getDevicePushState,
  isPushBannerDismissed,
  type DevicePushState,
} from '@/lib/push-registration-client';

async function openIosNotificationSettings(): Promise<void> {
  try {
    const { App } = await import('@capacitor/app');
    await App.openUrl({ url: 'app-settings:' });
  } catch {
    /* user can open Settings manually */
  }
}

function bodyForState(
  state: DevicePushState,
  reconnectFailed: boolean,
  t: ReturnType<typeof useLanguage>['t']
): string {
  if (state === 'denied') return t.timeClock.pushDeniedBody;
  if (state === 'native_unavailable') return t.timeClock.pushNativeUnavailableBody;
  if (state === 'granted_not_linked') {
    return reconnectFailed ? t.timeClock.pushGrantedNotLinkedFailedBody : t.timeClock.pushGrantedNotLinkedBody;
  }
  if (reconnectFailed) return t.timeClock.pushReconnectFailedBody;
  return t.timeClock.pushDisconnectedBody;
}

export function PushConnectionNotice() {
  const { t } = useLanguage();
  const [pushState, setPushState] = useState<DevicePushState>('no_consent');
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectFailed, setReconnectFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const load = useCallback(async () => {
    if (isPushBannerDismissed()) {
      setDismissed(true);
      return;
    }
    setDismissed(false);
    const state = await getDevicePushState();
    setPushState(state);
    if (state === 'connected') setReconnectFailed(false);
  }, []);

  useEffect(() => {
    void load();
    const onWake = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener(APP_RESUME_EVENT, onWake);
    document.addEventListener('visibilitychange', onWake);
    const id = window.setInterval(onWake, 60_000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [load]);

  if (dismissed || pushState === 'no_consent' || pushState === 'connected') return null;

  const denied = pushState === 'denied';
  const canDismiss = pushState === 'granted_not_linked' || pushState === 'native_unavailable';

  return (
    <div
      className="shrink-0 border-b border-amber-300/80 bg-amber-50 px-3 py-3 dark:border-amber-600/40 dark:bg-amber-950/40"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-amber-950 dark:text-amber-100">
            {t.timeClock.pushDisconnectedTitle}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            {bodyForState(pushState, reconnectFailed, t)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canDismiss ? (
            <button
              type="button"
              className="rounded-lg border border-amber-400/80 px-4 py-2 text-xs font-semibold text-amber-950 dark:text-amber-100"
              onClick={() => {
                dismissPushBanner(24);
                setDismissed(true);
              }}
            >
              {t.timeClock.pushDismissBanner}
            </button>
          ) : null}
          {denied ? (
            <button
              type="button"
              className="rounded-lg bg-ios-blue px-4 py-2 text-xs font-semibold text-white"
              onClick={() => {
                if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
                  void openIosNotificationSettings();
                }
              }}
            >
              {t.timeClock.pushOpenSettings}
            </button>
          ) : pushState === 'native_unavailable' ? null : (
            <button
              type="button"
              disabled={reconnecting}
              className="rounded-lg bg-ios-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() => {
                void (async () => {
                  setReconnecting(true);
                  setReconnectFailed(false);
                  try {
                    const { registered } = await ensurePushRegistered({ requestPermission: true });
                    if (registered) {
                      setPushState('connected');
                      return;
                    }
                    await reportPushDiagnostic('reconnect_button');
                    await load();
                    setReconnectFailed(true);
                  } finally {
                    setReconnecting(false);
                  }
                })();
              }}
            >
              {reconnecting ? t.timeClock.pushReconnecting : t.timeClock.pushReconnectNow}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
