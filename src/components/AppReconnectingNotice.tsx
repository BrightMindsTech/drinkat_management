'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { APP_RECONNECT_DONE, APP_RECONNECT_START } from '@/lib/app-resume-sync';

const MIN_VISIBLE_MS = 550;

/** Small top banner while push/session/data refresh on app open or resume. */
export function AppReconnectingNotice() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const onStart = () => {
      clearHideTimer();
      shownAtRef.current = Date.now();
      setShow(true);
    };

    const onDone = () => {
      clearHideTimer();
      const elapsed = Date.now() - shownAtRef.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimerRef.current = window.setTimeout(() => setShow(false), wait);
    };

    window.addEventListener(APP_RECONNECT_START, onStart);
    window.addEventListener(APP_RECONNECT_DONE, onDone);
    return () => {
      clearHideTimer();
      window.removeEventListener(APP_RECONNECT_START, onStart);
      window.removeEventListener(APP_RECONNECT_DONE, onDone);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex justify-center px-3 pt-[max(0.45rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-gray-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-ios-blue shadow-md backdrop-blur-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated/95">
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ios-blue border-t-transparent"
          aria-hidden
        />
        <span>{t.common.appReconnecting}</span>
      </div>
    </div>
  );
}
