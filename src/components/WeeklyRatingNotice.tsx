'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { setForegroundInterval } from '@/lib/app-foreground';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

const WEEKLY_RATING_NOTIF_ID = 'weekly-rating-reminder';

type WeeklyRatingState = {
  blockingClock?: boolean;
  complete?: boolean;
  expectedTargets?: { id: string; name: string; existing: unknown | null }[];
  ratingStyle?: string;
};

export function WeeklyRatingNotice({ role }: { role: string }) {
  const { t } = useLanguage();
  const { upsert, remove } = useInAppNotifications();
  const [state, setState] = useState<WeeklyRatingState | null>(null);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (role !== 'manager') return;

    let mounted = true;
    async function load() {
      try {
        const res = await fetchWithRetry('/api/ratings/weekly', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as WeeklyRatingState;
        if (mounted) setState(json);
      } catch {
        /* non-blocking */
      }
    }

    const onWake = () => {
      if (document.visibilityState === 'visible') void load();
    };

    void load();
    const stop = setForegroundInterval(onWake, 30000);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener(APP_RESUME_EVENT, onWake);
    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
    };
  }, [role]);

  const pending = useMemo(() => {
    if (!state) return 0;
    return (
      state.expectedTargets?.filter((target) => !target.existing).length ??
      (state.complete === false ? 1 : 0)
    );
  }, [state]);

  useEffect(() => {
    if (role !== 'manager' || pending <= 0) {
      if (syncedRef.current) {
        remove(WEEKLY_RATING_NOTIF_ID);
        syncedRef.current = false;
      }
      return;
    }

    syncedRef.current = true;
    upsert({
      id: WEEKLY_RATING_NOTIF_ID,
      title: t.ratings.weeklyReminderTitle,
      body: interpolate(t.ratings.weeklyReminderBody, { count: String(pending) }),
      persistent: true,
      minimizable: true,
      startMinimized: true,
      minimizedLabel: t.ratings.weeklyReminderTitle,
      actionLabel: t.ratings.openWeeklyRatings,
      href: '/dashboard/ratings',
    });
  }, [role, pending, upsert, remove, t]);

  useEffect(() => {
    return () => {
      if (syncedRef.current) remove(WEEKLY_RATING_NOTIF_ID);
    };
  }, [remove]);

  return null;
}
