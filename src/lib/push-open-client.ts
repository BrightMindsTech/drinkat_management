'use client';

import { consumePendingPushUrl, rememberPendingPushUrl } from '@/lib/push-pending';
import { resolvePushNavigationUrl, safeInternalPath } from '@/lib/push-navigation';

/** Navigate after the user opens a push notification (native or web). */
export function openPushDestination(data: Record<string, unknown> | undefined): void {
  if (typeof window === 'undefined' || !data) return;

  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') stringData[k] = v;
  }

  const resolved = resolvePushNavigationUrl(stringData);
  if (!resolved) return;
  const url = safeInternalPath(resolved);
  rememberPendingPushUrl(url);

  if (window.location.pathname.startsWith('/login')) {
    window.location.replace(`/login?callbackUrl=${encodeURIComponent(url)}`);
    return;
  }

  window.location.assign(url);
}

export function flushPendingPushNavigation(): void {
  if (typeof window === 'undefined') return;
  const url = consumePendingPushUrl();
  if (!url) return;
  if (window.location.pathname.startsWith('/login')) {
    window.location.replace(`/login?callbackUrl=${encodeURIComponent(url)}`);
    return;
  }
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (here === url) return;
  window.location.assign(url);
}
