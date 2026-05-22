'use client';

import { resolvePushNavigationUrl } from '@/lib/push-navigation';

/** Navigate after the user opens a push notification (native or web). */
export function openPushDestination(data: Record<string, unknown> | undefined): void {
  if (typeof window === 'undefined' || !data) return;

  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') stringData[k] = v;
  }

  const url = resolvePushNavigationUrl(stringData);
  if (!url) return;

  window.location.href = url;
}
