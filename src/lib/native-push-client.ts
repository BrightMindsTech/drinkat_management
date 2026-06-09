'use client';

import { Capacitor } from '@capacitor/core';
import { openPushDestination } from '@/lib/push-open-client';
import { getCachedApnsDeviceToken, setCachedApnsDeviceToken } from '@/lib/push-apns-cache';
import {
  isApnsDeviceTokenOnServer,
  syncApnsDeviceTokenToBackend,
  waitForApnsRegistration,
} from '@/lib/push-apns-sync';

/** WKWebView bridge injected by the native shell — absent when Capacitor JS injection is blocked. */
export function hasNativeCapacitorBridge(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { webkit?: { messageHandlers?: { bridge?: unknown } } };
  return Boolean(w.webkit?.messageHandlers?.bridge);
}

export function isIosUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** iPhone/iPad running the App Store app but Capacitor bridge failed to load (needs native rebuild). */
export function isBrokenNativeIosShell(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isIosUserAgent()) return false;
  if (hasNativeCapacitorBridge()) return false;
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') return false;
  // DrinkatHR-Native UA is set in capacitor.config.ts after the fix is shipped.
  if (navigator.userAgent.includes('DrinkatHR-Native')) return true;
  // Standalone / minimal-ui often indicates installed web app or Capacitor shell without bridge.
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return standalone;
}

/** True when running inside the Capacitor iOS shell (not Mobile Safari). */
export function isCapacitorIos(): boolean {
  if (typeof window === 'undefined') return false;
  if (hasNativeCapacitorBridge()) return true;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

function canUseNativePushPlugin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Capacitor.isPluginAvailable('PushNotifications');
  } catch {
    return false;
  }
}

export function isNativePushPluginAvailable(): boolean {
  return canUseNativePushPlugin();
}

/** Debug snapshot for Cloudflare logs when reconnect fails. */
export async function collectPushDiagnostic(): Promise<Record<string, unknown>> {
  const diag: Record<string, unknown> = {
    capacitorNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    webkitBridgePresent: hasNativeCapacitorBridge(),
    brokenNativeShell: isBrokenNativeIosShell(),
    webViewServerUrl:
      typeof window !== 'undefined'
        ? (window as Window & { WEBVIEW_SERVER_URL?: string }).WEBVIEW_SERVER_URL ?? null
        : null,
    pushPluginAvailable: canUseNativePushPlugin(),
    hasCachedToken: Boolean(getCachedApnsDeviceToken()),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
  };
  if (typeof window !== 'undefined') {
    diag.pushDebug = (window as Window & { __drinkatPushDebug?: unknown }).__drinkatPushDebug ?? null;
  }
  if (isCapacitorIos() && canUseNativePushPlugin()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      diag.permission = (await PushNotifications.checkPermissions()).receive;
    } catch (e) {
      diag.permissionError = String(e);
    }
  }
  return diag;
}

export async function reportPushDiagnostic(context: string): Promise<void> {
  try {
    const diagnostic = await collectPushDiagnostic();
    await fetch('/api/push/client-diagnostic', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ context, diagnostic }),
    });
  } catch {
    /* non-fatal */
  }
}

let registrationListenersAttached = false;
let deliveryListenersAttached = false;

function setPushDebug(patch: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const key = '__drinkatPushDebug';
  const prev = (window as Window & { [k: string]: unknown })[key];
  (window as Window & { [k: string]: unknown })[key] = {
    ...(typeof prev === 'object' && prev ? (prev as Record<string, unknown>) : {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

/** Attach APNs listeners once at startup — before any register() call. */
export async function attachIosPushRegistrationListeners(): Promise<void> {
  if (!canUseNativePushPlugin() || registrationListenersAttached) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');

  await PushNotifications.addListener('registration', async (token) => {
    setCachedApnsDeviceToken(token.value);
    setPushDebug({ phase: 'registration_event', tokenPreview: token.value.slice(0, 12) });
    const { ensurePushConsentOnServer } = await import('@/lib/push-registration-client');
    await ensurePushConsentOnServer();
    const ok = await syncApnsDeviceTokenToBackend(token.value);
    setPushDebug({ phase: 'registration_sync', registerOk: ok });
  });

  await PushNotifications.addListener('registrationError', (err) => {
    const maybeErr = err as { error?: string; message?: string; code?: string | number };
    setPushDebug({
      phase: 'registration_error',
      registrationError: maybeErr?.error ?? null,
      registrationMessage: maybeErr?.message ?? null,
      registrationCode: maybeErr?.code ?? null,
    });
  });

  registrationListenersAttached = true;
  setPushDebug({ phase: 'listeners_attached' });
}

/**
 * Tap-to-open deep links + keep push channel warm when returning to foreground.
 */
export async function setupNativePushDelivery(): Promise<void> {
  if (!canUseNativePushPlugin() || deliveryListenersAttached) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  deliveryListenersAttached = true;

  await attachIosPushRegistrationListeners();

  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const data = event.notification.data as Record<string, unknown> | undefined;
    openPushDestination(data);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const data = notification.data as Record<string, unknown> | undefined;
    const detail: Record<string, unknown> = { ...(data ?? {}) };
    if (notification.title && typeof detail.title !== 'string') detail.title = notification.title;
    if (notification.body && typeof detail.body !== 'string') detail.body = notification.body;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('drinkat:push-received', {
          detail,
        })
      );
    }
    if (data?.type === 'push_keepalive') {
      void import('@/lib/push-registration-client').then(({ ensurePushRegistered }) =>
        ensurePushRegistered({ requestPermission: false })
      );
    }
  });
}

async function tryExistingApnsToken(): Promise<boolean> {
  const cached = getCachedApnsDeviceToken();
  if (!cached) return false;
  if (await isApnsDeviceTokenOnServer(cached)) return true;
  return syncApnsDeviceTokenToBackend(cached);
}

/**
 * Registers with APNs via Capacitor and stores the device token for the signed-in user.
 */
export async function registerIosPushWithBackend(
  opts: { requestPermission?: boolean } = {}
): Promise<boolean> {
  const requestPermission = opts.requestPermission ?? false;
  setPushDebug({
    platform: Capacitor.getPlatform(),
    native: Capacitor.isNativePlatform(),
    pushPluginAvailable: canUseNativePushPlugin(),
    phase: 'register_start',
  });

  if (!canUseNativePushPlugin()) return false;
  if (Capacitor.getPlatform() !== 'ios' && Capacitor.isNativePlatform()) return false;

  await attachIosPushRegistrationListeners();

  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== 'granted') {
    if (!requestPermission) return false;
    perm = await PushNotifications.requestPermissions();
  }
  setPushDebug({ permission: perm.receive });
  if (perm.receive !== 'granted') return false;

  const { ensurePushConsentOnServer } = await import('@/lib/push-registration-client');
  await ensurePushConsentOnServer();

  await setupNativePushDelivery();

  if (await tryExistingApnsToken()) {
    setPushDebug({ phase: 'register_ok_existing_token' });
    return true;
  }

  try {
    await PushNotifications.register();
    setPushDebug({ phase: 'register_called' });
  } catch (e) {
    setPushDebug({ phase: 'register_throw', error: String(e) });
    return false;
  }

  const ok = await waitForApnsRegistration(15000);
  setPushDebug({ phase: ok ? 'register_ok_polled' : 'register_failed_polled' });
  return ok;
}
