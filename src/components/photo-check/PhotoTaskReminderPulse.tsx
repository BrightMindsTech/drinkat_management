'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { setForegroundInterval } from '@/lib/app-foreground';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { fetchWithRetry } from '@/lib/fetch-with-retry';
import {
  latestDuePhotoReminderSlot,
  latestPhotoReminderAt,
  shouldSendPhotoReminderAtClock,
} from '@/lib/photo-reminder-clock';

type PhotoTaskRow = {
  id: string;
  status: string;
  windowStartAt?: string;
  dueAt?: string;
  lastRemindedAt?: string | null;
};

function openUnfinished(items: PhotoTaskRow[]): PhotoTaskRow[] {
  const now = Date.now();
  return items.filter((row) => {
    if (
      row.status !== 'due' &&
      row.status !== 'overdue' &&
      row.status !== 'in_progress' &&
      row.status !== 'scheduled'
    ) {
      return false;
    }
    if (!row.windowStartAt || !row.dueAt) return false;
    const start = new Date(row.windowStartAt).getTime();
    const due = new Date(row.dueAt).getTime();
    return start <= now && now <= due;
  });
}

/** Surface a reminder at the branch clock slots even if APNs is quiet. */
export function PhotoTaskReminderPulse() {
  const { upsert } = useInAppNotifications();
  const { t } = useLanguage();
  const router = useRouter();
  const lastSlotKey = useRef<string>('');

  useEffect(() => {
    let mounted = true;

    async function tick() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetchWithRetry('/api/photo-checks/tasks?read=1', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as {
          required?: boolean;
          items?: PhotoTaskRow[];
          branchName?: string;
        };
        if (!json.required || !Array.isArray(json.items)) return;
        const open = openUnfinished(json.items);
        if (!open.length) {
          lastSlotKey.current = '';
          return;
        }
        const now = new Date();
        const last = latestPhotoReminderAt(
          open.map((row) => (row.lastRemindedAt ? new Date(row.lastRemindedAt) : null))
        );
        if (!shouldSendPhotoReminderAtClock(last, now, json.branchName)) return;
        const slot = latestDuePhotoReminderSlot(now, json.branchName);
        const slotKey = slot?.at.toISOString() ?? '';
        if (slotKey && lastSlotKey.current === slotKey) return;
        lastSlotKey.current = slotKey;
        const first = open[0]!;
        const href = `/dashboard/photo?task=${encodeURIComponent(first.id)}`;
        upsert({
          id: `photo-task-reminder-${now.getTime()}`,
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
