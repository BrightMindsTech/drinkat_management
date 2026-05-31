'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { ensurePushRegistered, fetchPushRegistrationStatus } from '@/lib/push-registration-client';

export function PushConnectionNotice() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const load = useCallback(async () => {
    const status = await fetchPushRegistrationStatus();
    if (!status?.pushConsent) {
      setShow(false);
      return;
    }
    const { registered } = await ensurePushRegistered({ requestPermission: false });
    setShow(!registered);
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

  if (!show) return null;

  return (
    <div
      className="shrink-0 border-b border-amber-300/80 bg-amber-50 px-3 py-2.5 dark:border-amber-600/40 dark:bg-amber-950/40"
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {t.timeClock.pushDisconnectedTitle}
          </p>
          <p className="text-xs text-amber-900/90 dark:text-amber-200/90">{t.timeClock.pushDisconnectedBody}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={reconnecting}
            className="rounded-lg bg-ios-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            onClick={() => {
              void (async () => {
                setReconnecting(true);
                try {
                  await ensurePushRegistered({ requestPermission: true });
                  await load();
                } finally {
                  setReconnecting(false);
                }
              })();
            }}
          >
            {reconnecting ? t.timeClock.pushReconnecting : t.timeClock.pushReconnectNow}
          </button>
        </div>
      </div>
    </div>
  );
}
