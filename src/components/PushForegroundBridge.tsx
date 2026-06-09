'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInAppNotifications } from '@/contexts/InAppNotificationContext';
import { resolvePushNavigationUrl } from '@/lib/push-navigation';

type PushReceivedDetail = Record<string, unknown>;

function detailId(detail: PushReceivedDetail): string {
  const type = typeof detail.type === 'string' ? detail.type : 'alert';
  const entity =
    detail.leaveRequestId ??
    detail.advanceId ??
    detail.submissionId ??
    detail.threadId ??
    detail.weekStartKey;
  return `push-${type}-${entity ?? Date.now()}`;
}

/** Show alerts in-app when the native shell receives push while foregrounded (iOS does not show a system banner). */
export function PushForegroundBridge() {
  const { upsert } = useInAppNotifications();
  const router = useRouter();

  useEffect(() => {
    const onPush = (event: Event) => {
      const detail = (event as CustomEvent<PushReceivedDetail>).detail ?? {};
      if (detail.type === 'push_keepalive') return;

      const title = typeof detail.title === 'string' && detail.title.trim() ? detail.title : 'DrinkatHR';
      const body = typeof detail.body === 'string' ? detail.body : '';
      const stringData: Record<string, string> = {};
      for (const [k, v] of Object.entries(detail)) {
        if (typeof v === 'string') stringData[k] = v;
      }
      const href = resolvePushNavigationUrl(stringData) ?? undefined;

      upsert({
        id: detailId(detail),
        title,
        body: body || undefined,
        href,
        minimizable: true,
        autoDismissMs: 12_000,
        actionLabel: href ? 'Open' : undefined,
        onAction: href ? () => router.push(href) : undefined,
      });
    };

    window.addEventListener('drinkat:push-received', onPush);
    return () => window.removeEventListener('drinkat:push-received', onPush);
  }, [router, upsert]);

  return null;
}
