'use client';

import { isCapacitorIos, registerIosPushWithBackend } from '@/lib/native-push-client';
import { subscribeWebPush, syncWebPushSubscriptionToBackend } from '@/lib/web-push-client';

export type PushRegistrationStatus = {
  pushConsent: boolean;
  subscriptionCount: number;
};

export type EnsurePushRegisteredOptions = {
  /** When true, may call Notification.requestPermission() once (e.g. consent save). */
  requestPermission?: boolean;
};

export type EnsurePushRegisteredResult = {
  /** Stop background retry loops when true. */
  done: boolean;
  /** Device token saved on server. */
  registered: boolean;
};

async function fetchConsentStatus(): Promise<PushRegistrationStatus | null> {
  try {
    const res = await fetch('/api/push/consent-status', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PushRegistrationStatus;
  } catch {
    return null;
  }
}

async function registerWebPushFromBrowser(requestPermission: boolean): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  await navigator.serviceWorker.register('/sw.js');
  const v = await fetch('/api/push/vapid-public', { credentials: 'include', cache: 'no-store' }).then((r) =>
    r.json()
  );
  if (!v.configured || !v.publicKey) return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return syncWebPushSubscriptionToBackend(existing);
  }

  if (!('Notification' in window)) return false;

  let perm = Notification.permission;
  if (perm === 'default' && requestPermission) {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') return false;

  const sub = await subscribeWebPush(v.publicKey);
  return sub != null;
}

/**
 * Re-sync or create push subscription when the user opted in (pushConsentAt).
 * Safe for App Store: only calls the OS permission dialog when requestPermission is true.
 */
export async function ensurePushRegistered(
  opts: EnsurePushRegisteredOptions = {}
): Promise<EnsurePushRegisteredResult> {
  const { requestPermission = false } = opts;
  const consent = await fetchConsentStatus();
  if (!consent) return { done: true, registered: false };
  if (!consent.pushConsent) return { done: true, registered: false };

  if (isCapacitorIos()) {
    const registered = await registerIosPushWithBackend();
    return { done: true, registered };
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
    return { done: true, registered: consent.subscriptionCount > 0 };
  }

  const registered = await registerWebPushFromBrowser(requestPermission);
  if (registered) return { done: true, registered: true };

  const after = await fetchConsentStatus();
  const hasSub = (after?.subscriptionCount ?? 0) > 0;
  if (hasSub) return { done: true, registered: true };

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
    return { done: true, registered: false };
  }

  // Consent on but no token yet — retry later (transient failure or permission still default).
  return { done: false, registered: false };
}
