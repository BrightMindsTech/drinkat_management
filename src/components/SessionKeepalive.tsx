'use client';

import { useEffect } from 'react';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { isAppForeground } from '@/lib/app-foreground';

/** Ping session endpoint so active users stay signed in (sliding cookie refresh). */
const KEEPALIVE_MS = 30 * 60 * 1000;

export function SessionKeepalive() {
  useEffect(() => {
    const ping = () => {
      if (!isAppForeground()) return;
      void fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
    };

    ping();
    const id = window.setInterval(ping, KEEPALIVE_MS);
    const onResume = () => ping();
    window.addEventListener(APP_RESUME_EVENT, onResume);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') ping();
    });

    return () => {
      window.clearInterval(id);
      window.removeEventListener(APP_RESUME_EVENT, onResume);
    };
  }, []);

  return null;
}
