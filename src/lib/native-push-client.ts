'use client';

import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor iOS shell (not Mobile Safari). */
export function isCapacitorIos(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Registers with APNs via Capacitor and stores the device token for the signed-in user.
 * Call after time-clock push consent is saved (session cookie present).
 */
export async function registerIosPushWithBackend(): Promise<boolean> {
  if (!isCapacitorIos()) return false;
  const { PushNotifications } = await import('@capacitor/push-notifications');

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive !== 'granted') {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== 'granted') return false;

  return new Promise((resolve) => {
    let finished = false;
    const finish = (ok: boolean) => {
      if (finished) return;
      finished = true;
      resolve(ok);
    };

    void (async () => {
      await PushNotifications.addListener('registration', async (token) => {
        try {
          const res = await fetch('/api/push/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'apns', token: token.value }),
          });
          finish(res.ok);
        } catch {
          finish(false);
        }
      });
      await PushNotifications.addListener('registrationError', () => {
        finish(false);
      });
      try {
        await PushNotifications.register();
      } catch {
        finish(false);
      }
    })();
  });
}
