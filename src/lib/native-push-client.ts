'use client';

import { Capacitor } from '@capacitor/core';
import { openPushDestination } from '@/lib/push-open-client';

/** True when running inside the Capacitor iOS shell (not Mobile Safari). */
export function isCapacitorIos(): boolean {
  if (typeof window === 'undefined') return false;
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

let registrationListenersAttached = false;
let deliveryListenersAttached = false;
let pendingFinish: ((ok: boolean) => void) | null = null;
let inFlightPromise: Promise<boolean> | null = null;

/**
 * Tap-to-open deep links + keep push channel warm when returning to foreground.
 */
export async function setupNativePushDelivery(): Promise<void> {
  if (!canUseNativePushPlugin() || deliveryListenersAttached) return;
  const { PushNotifications } = await import('@capacitor/push-notifications');
  deliveryListenersAttached = true;

  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    const data = event.notification.data as Record<string, unknown> | undefined;
    openPushDestination(data);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const data = notification.data as Record<string, unknown> | undefined;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('drinkat:push-received', {
          detail: data ?? {},
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

/**
 * Registers with APNs via Capacitor and stores the device token for the signed-in user.
 * Called automatically after sign-in (no time-clock visit required).
 */
export async function registerIosPushWithBackend(
  opts: { requestPermission?: boolean } = {}
): Promise<boolean> {
  const requestPermission = opts.requestPermission ?? false;
  const setDebug = (patch: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const key = '__drinkatPushDebug';
    const prev = (window as Window & { [k: string]: unknown })[key];
    const next = {
      ...(typeof prev === 'object' && prev ? (prev as Record<string, unknown>) : {}),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    (window as Window & { [k: string]: unknown })[key] = next;
  };

  const platform = Capacitor.getPlatform();
  const native = Capacitor.isNativePlatform();
  const pushPluginAvailable = canUseNativePushPlugin();
  setDebug({ platform, native, pushPluginAvailable });
  if (!pushPluginAvailable) return false;
  if (platform !== 'ios' && native) {
    // Keep this function iOS-focused; Android can be wired separately when needed.
    return false;
  }

  if (inFlightPromise) {
    setDebug({ phase: 'register_skipped_inflight' });
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    setDebug({ phase: 'start', platform: Capacitor.getPlatform(), native: Capacitor.isNativePlatform() });

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      if (!requestPermission) return false;
      perm = await PushNotifications.requestPermissions();
    }
    setDebug({ permission: perm.receive });
    if (perm.receive !== 'granted') return false;

    await setupNativePushDelivery();

    if (!registrationListenersAttached) {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          setDebug({ phase: 'registration_event', tokenPreview: token.value.slice(0, 12) });
          const res = await fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ provider: 'apns', token: token.value }),
          });
          const bodyText = await res.text().catch(() => '');
          setDebug({ phase: 'register_response', registerStatus: res.status, registerBody: bodyText.slice(0, 200) });
          pendingFinish?.(res.ok);
          pendingFinish = null;
        } catch (e) {
          setDebug({ phase: 'register_fetch_error', error: String(e) });
          pendingFinish?.(false);
          pendingFinish = null;
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        const maybeErr = err as { error?: string; message?: string; code?: string | number };
        setDebug({
          phase: 'registration_error',
          registrationError: maybeErr?.error ?? null,
          registrationMessage: maybeErr?.message ?? null,
          registrationCode: maybeErr?.code ?? null,
        });
        pendingFinish?.(false);
        pendingFinish = null;
      });

      registrationListenersAttached = true;
    }

    return new Promise((resolve) => {
      let timeoutId: number | null = null;
      pendingFinish = (ok: boolean) => {
        if (timeoutId != null) window.clearTimeout(timeoutId);
        resolve(ok);
      };
      timeoutId = window.setTimeout(() => {
        setDebug({ phase: 'register_timeout' });
        pendingFinish?.(false);
        pendingFinish = null;
      }, 12000);
      void PushNotifications.register().catch((e) => {
        setDebug({ phase: 'register_throw', error: String(e) });
        pendingFinish?.(false);
        pendingFinish = null;
      });
      setDebug({ phase: 'register_called' });
    });
  })();

  const result = await inFlightPromise.catch(() => false);
  inFlightPromise = null;
  return result;
}
