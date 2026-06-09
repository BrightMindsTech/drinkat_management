'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { setForegroundInterval } from '@/lib/app-foreground';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

type PendingItem = {
  id: string;
  type: 'qc_review' | 'forms_review' | 'staff_qc_submit' | 'leave_review' | 'advance_review' | 'qc_form_submitted';
  title: string;
  subtitle?: string;
  href: string;
};
type PendingPayload = { total: number; items: PendingItem[] };

const PENDING_PREFIX = 'pending-review-';
const PENDING_SUMMARY_ID = 'pending-review-summary';

function itemTitle(
  item: PendingItem,
  role: string,
  t: ReturnType<typeof useLanguage>['t']
): string {
  const isQcForm = item.type === 'qc_form_submitted' || item.type === 'forms_review';
  if (item.type === 'leave_review') return t.hr.leaveRequests;
  if (item.type === 'advance_review') return t.hr.advances;
  if (isQcForm && role === 'manager') return t.forms.qcSubmissionNotifyTitle;
  return item.title;
}

function itemBody(item: PendingItem): string | undefined {
  const bodyParts = [
    item.type === 'leave_review' || item.type === 'advance_review' ? item.title : null,
    item.subtitle,
  ].filter(Boolean);
  return bodyParts.length > 0 ? bodyParts.join(' · ') : undefined;
}

export function PendingReviewNotice({ role }: { role: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { upsert, remove, dismiss } = useInAppNotifications();
  const [data, setData] = useState<PendingPayload | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const syncedRef = useRef<Set<string>>(new Set());
  const itemKeyRef = useRef('');

  useEffect(() => {
    if (role !== 'owner' && role !== 'qc' && role !== 'staff' && role !== 'manager' && role !== 'marketing') return;

    let mounted = true;
    async function load() {
      try {
        const res = await fetchWithRetry('/api/review-notifications', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as PendingPayload;
        if (!mounted) return;
        setData(json);
        setRemovedIds((prev) => prev.filter((id) => json.items.some((item) => item.id === id)));
      } catch {
        // keep silent; this is a non-blocking enhancement
      }
    }

    const onWake = () => {
      if (document.visibilityState === 'visible') void load();
    };

    void load();
    const stop = setForegroundInterval(onWake, 12000);
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener(APP_RESUME_EVENT, onWake);
    return () => {
      mounted = false;
      stop();
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
    };
  }, [role]);

  const visibleItems = useMemo(
    () => (data?.items ?? []).filter((item) => !removedIds.includes(item.id)),
    [data, removedIds]
  );

  const visibleItemIds = useMemo(() => visibleItems.map((i) => i.id).join('|'), [visibleItems]);

  useEffect(() => {
    if (visibleItemIds !== itemKeyRef.current) {
      itemKeyRef.current = visibleItemIds;
      if (visibleItemIds) setBannerDismissed(false);
    }
  }, [visibleItemIds]);

  const acknowledgeBanner = () => setBannerDismissed(true);

  const openItem = (item: PendingItem, dismissNotifId?: string) => {
    dismiss(dismissNotifId ?? PENDING_SUMMARY_ID);
    setBannerDismissed(true);
    router.push(item.href);
  };

  useEffect(() => {
    if (bannerDismissed || visibleItems.length === 0) {
      if (visibleItems.length === 0) {
        for (const id of syncedRef.current) remove(id);
        syncedRef.current.clear();
      }
      return;
    }

    const nextIds = new Set<string>();

    if (visibleItems.length === 1) {
      remove(PENDING_SUMMARY_ID);
      const item = visibleItems[0]!;
      const notifId = `${PENDING_PREFIX}${item.id}`;
      nextIds.add(notifId);
      syncedRef.current = nextIds;

      upsert({
        id: notifId,
        title: itemTitle(item, role, t),
        body: itemBody(item),
        persistent: true,
        minimizable: true,
        startMinimized: true,
        minimizedLabel: itemTitle(item, role, t),
        actionLabel: t.common.goToPending,
        onAction: () => openItem(item, notifId),
        onDismissed: acknowledgeBanner,
      });
      return;
    }

    for (const item of visibleItems) {
      remove(`${PENDING_PREFIX}${item.id}`);
    }

    nextIds.add(PENDING_SUMMARY_ID);
    syncedRef.current = nextIds;

    const count = visibleItems.length;
    upsert({
      id: PENDING_SUMMARY_ID,
      title: interpolate(t.common.pendingReviewTitle, { count: String(count) }),
      body: interpolate(t.common.pendingReviewBody, { count: String(count) }),
      persistent: true,
      minimizable: true,
      startMinimized: true,
      minimizedLabel: interpolate(t.common.pendingReviewTitle, { count: String(count) }),
      actionLabel: t.common.goToPending,
      onAction: () => openItem(visibleItems[0]!),
      onDismissed: acknowledgeBanner,
      content: (
        <ul className="max-h-36 space-y-1.5 overflow-y-auto overscroll-contain text-xs">
          {visibleItems.slice(0, 8).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openItem(item)}
                className="w-full rounded-md px-1 py-0.5 text-start font-medium text-ios-blue hover:bg-amber-50 dark:hover:bg-ios-dark-fill"
              >
                {item.title}
                {item.subtitle ? <span className="font-normal text-app-muted"> · {item.subtitle}</span> : null}
              </button>
            </li>
          ))}
          {count > 8 ? <li className="px-1 text-app-muted">+{count - 8} more</li> : null}
        </ul>
      ),
    });
  }, [bannerDismissed, visibleItems, visibleItemIds, role, router, upsert, remove, dismiss, t]);

  useEffect(() => {
    return () => {
      for (const id of syncedRef.current) remove(id);
      syncedRef.current.clear();
    };
  }, [remove]);

  return null;
}
