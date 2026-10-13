'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { setForegroundInterval } from '@/lib/app-foreground';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

const INTERVAL_MS = 30 * 60 * 1000;

type PhotoTaskRow = { id: string; status: string; windowStartAt?: string; dueAt?: string };

function openUnfinished(items: PhotoTaskRow[]): PhotoTaskRow[] {
  const now = Date.now();
  return items.filter((row) => {
    if (row.status !== 'due' && row.status !== 'overdue' && row.status !== 'in_progress') return false;
    if (!row.windowStartAt || !row.dueAt) return false;
    const start = new Date(row.windowStartAt).getTime();
    const due = new Date(row.dueAt).getTime();
    return start <= now && now <= due;
  });
}

/** While a photo window is open, surface a reminder every 30 minutes even if APNs is quiet. */
export function PhotoTaskReminderPulse() {
  const { upsert } = useInAppNotifications();
  const { t } = useLanguage();
  const router = useRouter();
  const lastRemindedAt = useRef<number>(0);

  useEffect(() => {
    let mounted = true;

    async function tick() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetchWithRetry('/api/photo-checks/tasks', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as { required?: boolean; items?: PhotoTaskRow[] };
        if (!json.required || !Array.isArray(json.items)) return;
        const open = openUnfinished(json.items);
        if (!open.length) {
          lastRemindedAt.current = 0;
          return;
        }
        const now = Date.now();
        if (!lastRemindedAt.current) {
          lastRemindedAt.current = now;
          return;
        }
        if (now - lastRemindedAt.current < INTERVAL_MS) return;
        lastRemindedAt.current = now;
        const first = open[0]!;
        const href = `/dashboard/photo?task=${encodeURIComponent(first.id)}`;
        upsert({
          id: `photo-task-reminder-${now}`,
          title: t.photoCheck.reminderTitle,
          body: t.photoCheck.reminderBody,
          href,
          minimizable: true,
          actionLabel: t.photoCheck.openTask,
          onAction: () => router.push(href),
        });
      } catch {
        /* non-blocking */
      }
    }

    const onWake = () => {
      if (mounted) void tick();
    };
    const stop = setForegroundInterval(onWake, 60_000);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener(APP_RESUME_EVENT, onWake);
    void tick();
    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
    };
  }, [router, t.photoCheck.openTask, t.photoCheck.reminderBody, t.photoCheck.reminderTitle, upsert]);

  return null;
}
