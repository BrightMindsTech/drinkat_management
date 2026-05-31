'use client';

import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { isInsideBranchRadius } from '@/lib/geo';
import { isCapacitorIos } from '@/lib/native-push-client';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

let watcherId: string | null = null;
let lastInside: boolean | null = null;
let startInFlight: Promise<boolean> | null = null;

export type NativeBackgroundGeofenceOpts = {
  branchLat: number;
  branchLng: number;
  radiusM: number;
  onTransition: (kind: 'enter' | 'exit', lat: number, lng: number) => void | Promise<void>;
  onError?: (code: string) => void;
};

/** Native iOS background GPS while clocked in — keeps shift geofence alive when app is backgrounded. */
export async function startNativeBackgroundGeofence(opts: NativeBackgroundGeofenceOpts): Promise<boolean> {
  if (!isCapacitorIos()) return false;

  if (startInFlight) return startInFlight;
  startInFlight = (async () => {
    if (watcherId) await stopNativeBackgroundGeofence();

    try {
      const id = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Location is used to verify branch attendance while you are clocked in.',
          backgroundTitle: 'DrinkatHR — shift active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 30,
        },
        (location, error) => {
          if (error) {
            if (error.code === 'NOT_AUTHORIZED') opts.onError?.('NOT_AUTHORIZED');
            return;
          }
          if (!location) return;

          const lat = location.latitude;
          const lng = location.longitude;
          const inside = isInsideBranchRadius(lat, lng, opts.branchLat, opts.branchLng, opts.radiusM);
          const prev = lastInside;
          lastInside = inside;

          if (prev === null) {
            if (inside) void opts.onTransition('enter', lat, lng);
            return;
          }
          if (prev !== inside) {
            void opts.onTransition(inside ? 'enter' : 'exit', lat, lng);
          }
        }
      );
      watcherId = id;
      return true;
    } catch {
      return false;
    } finally {
      startInFlight = null;
    }
  })();

  return startInFlight;
}

export async function stopNativeBackgroundGeofence(): Promise<void> {
  startInFlight = null;
  if (!watcherId) {
    lastInside = null;
    return;
  }
  const id = watcherId;
  watcherId = null;
  lastInside = null;
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundGeolocation.removeWatcher({ id });
  } catch {
    /* ignore */
  }
}

export function nativeBackgroundGeofenceActive(): boolean {
  return watcherId != null;
}
