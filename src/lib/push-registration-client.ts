'use client';

import {
  isBrokenNativeIosShell,
  isCapacitorIos,
  isIosUserAgent,
  isNativePushPluginAvailable,
  registerIosPushWithBackend,
  attachIosPushRegistrationListeners,
  reportPushDiagnostic,
} from '@/lib/native-push-client';
import { getCachedApnsDeviceToken } from '@/lib/push-apns-cache';
import { isApnsDeviceTokenOnServer, syncApnsDeviceTokenToBackend } from '@/lib/push-apns-sync';
import { subscribeWebPush, syncWebPushSubscriptionToBackend } from '@/lib/web-push-client';
import { fetchWithRetry } from '@/lib/fetch-with-retry';

export type PushRegistrationStatus = {
  pushConsent: boolean;
  subscriptionCount: number;
};

export type EnsurePushRegisteredOptions = {
  /** When true, may show the OS permission dialog. When omitted, prompts only if not yet granted. */
  requestPermission?: boolean;
};

export type EnsurePushRegisteredResult = {
  /** Stop background retry loops when true. */
  done: boolean;
  /** Device token saved on server. */
  registered: boolean;
};

/** Retry when this device is not registered; re-register periodically while app is open. */
const RETRY_WHEN_DISCONNECTED_MS = 3 * 60 * 1000;
const REREGISTER_INTERVAL_MS = 4 * 60 * 60 * 1000;
const PUSH_SYNC_DEFER_MS = 8_000;
const PUSH_SYNC_MIN_GAP_MS = 45_000;

let pushRegisterInFlight: Promise<EnsurePushRegisteredResult> | null = null;
let lastPushSyncAt = 0;

export type DevicePushState =
  | 'connected'
  | 'needs_permission'
  | 'denied'
  | 'no_consent'
  /** iOS allowed notifications but this phone's token is not on the server yet. */
  | 'granted_not_linked'
  /** Native shell missing push plugin — needs App Store app update, not a web deploy. */
  | 'native_unavailable';

const BANNER_DISMISS_KEY = 'drinkat-push-banner-dismiss-until';
const PERM_PROMPT_THROTTLE_KEY = 'drinkat-push-perm-prompt-at';
const PERM_PROMPT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Throttle OS permission dialogs so retries do not spam users. */
export function shouldThrottlePushPermissionPrompt(): boolean {
  if (typeof window === 'undefined') return true;
  const last = Number(localStorage.getItem(PERM_PROMPT_THROTTLE_KEY) || 0);
  if (Number.isFinite(last) && Date.now() - last < PERM_PROMPT_INTERVAL_MS) return true;
  localStorage.setItem(PERM_PROMPT_THROTTLE_KEY, String(Date.now()));
  return false;
}

export function isPushBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(BANNER_DISMISS_KEY);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now();
}

export function dismissPushBanner(hours = 24): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BANNER_DISMISS_KEY, String(Date.now() + hours * 60 * 60 * 1000));
}

export async function fetchPushRegistrationStatus(): Promise<PushRegistrationStatus | null> {
  try {
    const res = await fetchWithRetry('/api/push/consent-status', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PushRegistrationStatus;
  } catch {
    return null;
  }
}

/** Opt in to push on the server for any role (owner, remote staff, etc.). Idempotent. */
export async function ensurePushConsentOnServer(): Promise<boolean> {
  try {
    const res = await fetchWithRetry('/api/push/opt-in', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** True when this device has not granted notification permission yet. */
export async function needsPushPermissionPrompt(): Promise<boolean> {
  if (isCapacitorIos()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.checkPermissions();
      return perm.receive !== 'granted';
    } catch {
      return true;
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'default';
  }
  return false;
}

async function registerWebPushFromBrowser(requestPermission: boolean): Promise<boolean> {
  // iOS Safari/WKWebView cannot use web push; registering sw.js can interfere with Capacitor.
  if (isIosUserAgent()) return false;
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

async function isIosDevicePushConnected(): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'denied') return false;
    if (perm.receive !== 'granted') return false;

    const cached = getCachedApnsDeviceToken();
    if (!cached) return false;
    if (await isApnsDeviceTokenOnServer(cached)) return true;
    return syncApnsDeviceTokenToBackend(cached);
  } catch {
    return false;
  }
}

/** Passive check — does not call APNs register() (avoids 12s hangs on every page load). */
export async function getDevicePushState(): Promise<DevicePushState> {
  await ensurePushConsentOnServer();
  const status = await fetchPushRegistrationStatus();
  if (!status?.pushConsent) return 'no_consent';

  if (isBrokenNativeIosShell()) return 'native_unavailable';

  if (isCapacitorIos()) {
    if (!isNativePushPluginAvailable()) return 'native_unavailable';
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'denied') return 'denied';
      if (perm.receive !== 'granted') return 'needs_permission';
      return (await isIosDevicePushConnected()) ? 'connected' : 'granted_not_linked';
    } catch {
      return 'needs_permission';
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'denied') return 'denied';
    if (Notification.permission !== 'granted') return 'needs_permission';
  }

  return isWebPushConnectedLocally(status);
}

/** Passive check only — does not hit /api/push/register (avoids D1 spam while browsing). */
function isWebPushConnectedLocally(status: PushRegistrationStatus): DevicePushState {
  if (typeof window === 'undefined') return 'needs_permission';
  if (!('Notification' in window)) return 'needs_permission';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'needs_permission';
  if (status.subscriptionCount > 0) return 'connected';
  return 'granted_not_linked';
}

/**
 * Connect push for the signed-in user on this device.
 * Auto-enables server consent on sign-in; may prompt for OS permission when needed.
 */
export async function ensurePushRegistered(
  opts: EnsurePushRegisteredOptions = {}
): Promise<EnsurePushRegisteredResult> {
  if (pushRegisterInFlight) return pushRegisterInFlight;

  const now = Date.now();
  if (now - lastPushSyncAt < PUSH_SYNC_MIN_GAP_MS && !opts.requestPermission) {
    return { done: true, registered: false };
  }

  pushRegisterInFlight = (async (): Promise<EnsurePushRegisteredResult> => {
    lastPushSyncAt = Date.now();
    await attachIosPushRegistrationListeners();
    await ensurePushConsentOnServer();

    const consent = await fetchPushRegistrationStatus();
    if (!consent) return { done: true, registered: false };
    if (!consent.pushConsent) return { done: true, registered: false };

    const requestPermission =
      opts.requestPermission !== undefined ? opts.requestPermission : await needsPushPermissionPrompt();

    if (isCapacitorIos()) {
      if (!requestPermission && (await isIosDevicePushConnected())) {
        return { done: true, registered: true };
      }
      const registered = await registerIosPushWithBackend({ requestPermission });
      return { done: true, registered };
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
      return { done: true, registered: false };
    }

    if (!requestPermission && isWebPushConnectedLocally(consent) === 'connected') {
      return { done: true, registered: true };
    }

    const registered = await registerWebPushFromBrowser(requestPermission);
    if (registered) return { done: true, registered: true };

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
      return { done: true, registered: false };
    }

    return { done: false, registered: false };
  })().finally(() => {
    pushRegisterInFlight = null;
  });

  return pushRegisterInFlight;
}

/**
 * Keeps push registration fresh: retry when disconnected, periodic re-register while dashboard is open.
 */
export function bindPushRegistrationKeepalive(): () => void {
  if (typeof window === 'undefined') return () => {};

  let disposed = false;
  let retryTimer: number | null = null;
  let periodicTimer: number | null = null;

  const sync = async () => {
    if (disposed) return;
    const requestPermission = await needsPushPermissionPrompt();
    void ensurePushRegistered({ requestPermission });
  };

  const retryIfNeeded = async () => {
    if (disposed) return;
    const state = await getDevicePushState();
    if (state === 'connected' || state === 'denied' || state === 'native_unavailable' || state === 'no_consent') {
      return;
    }
    const requestPermission =
      state === 'needs_permission' ? !shouldThrottlePushPermissionPrompt() : false;
    void ensurePushRegistered({ requestPermission });
  };

  void attachIosPushRegistrationListeners();
  if (isCapacitorIos()) {
    void import('@/lib/native-push-client').then(({ setupNativePushDelivery }) => setupNativePushDelivery());
  }
  window.setTimeout(() => void sync(), PUSH_SYNC_DEFER_MS);
  retryTimer = window.setInterval(() => void retryIfNeeded(), RETRY_WHEN_DISCONNECTED_MS);
  periodicTimer = window.setInterval(() => void sync(), REREGISTER_INTERVAL_MS);

  return () => {
    disposed = true;
    if (retryTimer != null) window.clearInterval(retryTimer);
    if (periodicTimer != null) window.clearInterval(periodicTimer);
  };
}
