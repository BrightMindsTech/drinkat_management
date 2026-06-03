'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { setForegroundInterval } from '@/lib/app-foreground';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';

type PendingItem = {
  id: string;
  type: 'qc_review' | 'forms_review' | 'staff_qc_submit' | 'leave_review' | 'advance_review' | 'qc_form_submitted';
  title: string;
  subtitle?: string;
  href: string;
};
type PendingPayload = { total: number; items: PendingItem[] };

const PENDING_PREFIX = 'pending-review-';

export function PendingReviewNotice({ role }: { role: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const { upsert, remove } = useInAppNotifications();
  const [data, setData] = useState<PendingPayload | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const syncedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (role !== 'owner' && role !== 'qc' && role !== 'staff' && role !== 'manager' && role !== 'marketing') return;

    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/review-notifications', { cache: 'no-store' });
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

  const isStaff = role === 'staff' || role === 'marketing';
  const visibleItems = (data?.items ?? []).filter((item) => !removedIds.includes(item.id));

  useEffect(() => {
    const nextIds = new Set(visibleItems.map((item) => `${PENDING_PREFIX}${item.id}`));
    for (const id of syncedRef.current) {
      if (!nextIds.has(id)) remove(id);
    }
    syncedRef.current = nextIds;

    for (const item of visibleItems) {
      const notifId = `${PENDING_PREFIX}${item.id}`;
      const isQcForm = item.type === 'qc_form_submitted' || item.type === 'forms_review';
      const title =
        item.type === 'leave_review'
          ? t.hr.leaveRequests
          : item.type === 'advance_review'
            ? t.hr.advances
            : isQcForm && role === 'manager'
              ? t.forms.qcSubmissionNotifyTitle
              : item.title;
      const bodyParts = [
        item.type === 'leave_review' || item.type === 'advance_review' ? item.title : null,
        item.subtitle,
      ].filter(Boolean);
      const body = bodyParts.length > 0 ? bodyParts.join(' · ') : undefined;

      upsert({
        id: notifId,
        title,
        body,
        persistent: true,
        actionLabel: t.common.goToPending,
        onAction: () => {
          setRemovedIds((prev) => [...prev, item.id]);
          remove(notifId);
          router.push(item.href);
        },
      });
    }
  }, [visibleItems, isStaff, role, router, upsert, remove, t]);

  useEffect(() => {
    return () => {
      for (const id of syncedRef.current) remove(id);
      syncedRef.current.clear();
    };
  }, [remove]);

  return null;
}
