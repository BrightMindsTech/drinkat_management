'use client';

import { useEffect, useRef } from 'react';
import { AppModal } from '@/components/AppModal';
import { isInsideBranchRadius } from '@/lib/geo';

export type TimeClockStatus = {
  applicable: boolean;
  reason?: string;
  employeeName?: string;
  /** QC dept / named remote: no branch radius for clock in-out; client skips fence watch. */
  geofenceExempt?: boolean;
  /** Full-time only: auto clock-in when GPS enters branch geofence. */
  autoGeofenceClockIn?: boolean;
  employmentType?: string;
  displayTimeZone?: string;
  shift?: {
    id: string;
    key: string;
    startMinute: number;
    endMinute: number;
    crossesMidnight: boolean;
  } | null;
  branch?: {
    id: string;
    name: string;
    hasGeofence: boolean;
    geofenceRadiusM: number;
    latitude: number | null;
    longitude: number | null;
    shiftProfile?: string;
  };
  consent?: { location: boolean; push: boolean };
  clock?: { id: string; clockInAt: string } | null;
  away?: { id: string; kind: string; endsAt: string; otherNote: string | null } | null;
  weeklyRating?: {
    blocking: boolean;
    weekStartKey: string;
    emphasisWeekend: boolean;
  } | null;
};

export function useGeofenceWatch(opts: {
  enabled: boolean;
  branchLat: number | null;
  branchLng: number | null;
  radiusM: number;
  onPosition: (p: { lat: number; lng: number }) => void;
  onTransition: (kind: 'enter' | 'exit', lat: number, lng: number) => void | Promise<void>;
  onError: (message: string) => void;
  geoMessages?: {
    permissionDenied: string;
    unavailable: string;
    timedOut: string;
  };
}) {
  const { enabled, branchLat, branchLng, radiusM, onPosition, onTransition, onError, geoMessages } = opts;
  const geo = geoMessages ?? {
    permissionDenied:
      'Location permission denied on iOS. Enable Location in Safari settings for this site.',
    unavailable: 'GPS is unavailable. Make sure Location Services are enabled and try again.',
    timedOut: 'GPS timed out. Keep the page open, then try reloading or toggling location permission.',
  };
  const lastInsideRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || branchLat == null || branchLng == null) return;
    const handlePosition = async (p: GeolocationPosition) => {
      const lat = p.coords.latitude;
      const lng = p.coords.longitude;
      onPosition({ lat, lng });
      const inside = isInsideBranchRadius(lat, lng, branchLat, branchLng, radiusM);
      const prev = lastInsideRef.current;
      if (prev === null) {
        lastInsideRef.current = inside;
        await onTransition(inside ? 'enter' : 'exit', lat, lng);
        return;
      }
      if (prev !== inside) {
        lastInsideRef.current = inside;
        await onTransition(inside ? 'enter' : 'exit', lat, lng);
      }
    };
    const handleError = (e: GeolocationPositionError) => {
      if (e.code === e.PERMISSION_DENIED) {
        onError(geo.permissionDenied);
        return;
      }
      if (e.code === e.POSITION_UNAVAILABLE) {
        onError(geo.unavailable);
        return;
      }
      onError(geo.timedOut);
    };

    navigator.geolocation.getCurrentPosition(
      (p) => {
        void handlePosition(p);
      },
      handleError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    const id = navigator.geolocation.watchPosition(
      (p) => {
        void handlePosition(p);
      },
      handleError,
      { enableHighAccuracy: true, maximumAge: 12000, timeout: 25000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled, branchLat, branchLng, radiusM, onPosition, onTransition, onError, geoMessages]);
}

export function ForcedAwayModal({
  onPick,
  onEndShift,
  otherText,
  setOtherText,
  loading,
  endShiftLoading,
  notice,
  onClose,
  t,
}: {
  onPick: (k: 'break' | 'bathroom' | 'other', note?: string) => void;
  onEndShift: () => void;
  otherText: string;
  setOtherText: (s: string) => void;
  loading: boolean;
  endShiftLoading: boolean;
  notice: string | null;
  onClose: () => void;
  t: { timeClock: Record<string, string>; common: Record<string, string> };
}) {
  const busy = loading || endShiftLoading;
  return (
    <AppModal
      open
      onClose={onClose}
      zIndexClass="z-[200]"
      panelClassName="max-w-md w-full rounded-2xl bg-white dark:bg-ios-dark-elevated p-6 shadow-xl space-y-4"
      closeOnBackdrop={false}
    >
        {notice ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-app-label">{t.timeClock.whereGoing}</h2>
            <p className="text-sm text-app-secondary">{notice}</p>
            <button
              type="button"
              className="w-full rounded-xl bg-ios-blue py-3 text-white font-medium"
              onClick={onClose}
            >
              {t.common.close}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-app-label">{t.timeClock.didYouLeave}</h2>
            <p className="text-sm text-app-secondary">{t.timeClock.whereGoingHint}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl border border-gray-200 dark:border-ios-dark-separator py-3 text-left px-4 font-medium disabled:opacity-50"
                onClick={() => onPick('bathroom')}
              >
                {t.timeClock.optBathroom} (10 min)
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-xl border border-gray-200 dark:border-ios-dark-separator py-3 text-left px-4 font-medium disabled:opacity-50"
                onClick={() => onPick('break')}
              >
                {t.timeClock.optBreak} (30 min)
              </button>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.timeClock.optOther}</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-fill px-3 py-2 text-sm"
                  rows={2}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  placeholder={t.timeClock.otherPlaceholder}
                  disabled={busy}
                />
                <button
                  type="button"
                  disabled={!otherText.trim() || busy}
                  className="w-full rounded-xl bg-ios-blue py-3 text-white font-medium disabled:opacity-50"
                  onClick={() => onPick('other', otherText.trim())}
                >
                  {t.timeClock.submitOther}
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-ios-dark-separator pt-4 mt-2 space-y-2">
              <p className="text-xs text-app-secondary">{t.timeClock.endShiftHint}</p>
              <button
                type="button"
                disabled={busy}
                className="w-full rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 py-3 text-white font-semibold disabled:opacity-50"
                onClick={onEndShift}
              >
                {endShiftLoading ? t.timeClock.endShiftLoading : t.timeClock.endShift}
              </button>
            </div>
          </>
        )}
    </AppModal>
  );
}
