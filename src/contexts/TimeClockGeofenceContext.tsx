'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { normalizeUserRole } from '@/lib/formVisibility';
import { APP_RESUME_EVENT } from '@/lib/app-resume-sync';
import { isAppForeground, setForegroundInterval } from '@/lib/app-foreground';
import {
  startNativeBackgroundGeofence,
  stopNativeBackgroundGeofence,
} from '@/lib/native-background-geofence';
import { ensurePushRegistered } from '@/lib/push-registration-client';
import { ForcedAwayModal, useGeofenceWatch, type TimeClockStatus } from '@/components/time-clock/geofence-shared';
import { isInsideBranchRadius } from '@/lib/geo';

const awayMinutesByKind: Record<'break' | 'bathroom' | 'other', number> = {
  break: 30,
  bathroom: 10,
  other: 10,
};

const AUTO_CLOCK_IN_MAX_ATTEMPTS = 3;
const AUTO_CLOCK_IN_RETRY_MS = 2500;
/** While inside geofence and not clocked in, retry auto clock-in periodically. */
const AUTO_CLOCK_IN_RECONCILE_MS = 30_000;
/** Require several consecutive outside readings before prompting (GPS jitter). */
const PRESENCE_OUTSIDE_STREAK = 3;
const PRESENCE_CHECK_INTERVAL_MS = 15_000;
/** After dismissing "did you leave?", wait before prompting again. */
const FORCE_AWAY_DISMISS_COOLDOWN_MS = 5 * 60 * 1000;

let autoClockInInFlight = false;

async function postAutoClockInWithRetries(lat: number, lng: number): Promise<boolean> {
  if (autoClockInInFlight) return false;
  autoClockInInFlight = true;
  try {
    for (let attempt = 0; attempt < AUTO_CLOCK_IN_MAX_ATTEMPTS; attempt++) {
      try {
        const cin = await fetch('/api/time-clock/clock-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        if (cin.ok) return true;
        const body = (await cin.json().catch(() => ({}))) as { alreadyClockedIn?: boolean };
        if (body.alreadyClockedIn) return true;
        if (cin.status === 400 || cin.status === 403) return false;
      } catch {
        /* retry */
      }
      if (attempt < AUTO_CLOCK_IN_MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, AUTO_CLOCK_IN_RETRY_MS));
      }
    }
    return false;
  } finally {
    autoClockInInFlight = false;
  }
}

async function postLocationEvent(kind: 'enter' | 'exit', lat: number, lng: number) {
  try {
    const res = await fetch('/api/time-clock/location-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, lat, lng }),
    });
    return (await res.json().catch(() => ({}))) as { action?: string; inside?: boolean };
  } catch {
    return {};
  }
}

export type TimeClockGeofenceContextValue = {
  status: TimeClockStatus | null;
  refresh: () => Promise<TimeClockStatus | null>;
  err: string | null;
  setErr: (e: string | null) => void;
  pos: { lat: number; lng: number } | null;
};

const TimeClockGeofenceContext = createContext<TimeClockGeofenceContextValue | null>(null);

export function useTimeClockGeofence() {
  const v = useContext(TimeClockGeofenceContext);
  if (!v) throw new Error('useTimeClockGeofence must be used within TimeClockGeofenceProvider');
  return v;
}

function TimeClockGeofenceProviderInner({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<TimeClockStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [forceAwayOpen, setForceAwayOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [awayNotice, setAwayNotice] = useState<string | null>(null);
  const [awaySubmitting, setAwaySubmitting] = useState(false);
  const [endShiftSubmitting, setEndShiftSubmitting] = useState(false);
  const exitCheckRaisedRef = useRef(false);
  const awayActionInFlightRef = useRef(false);
  const outsideStreakRef = useRef(0);
  const forceAwayDismissedUntilRef = useRef(0);

  const timeClockHref = '/dashboard/time-clock';
  const ratingsHref = '/dashboard/ratings';
  const onTimeClockPage =
    pathname === timeClockHref || pathname === `${timeClockHref}/` || (pathname?.startsWith(`${timeClockHref}/`) ?? false);
  const onRatingsPage =
    pathname === ratingsHref || pathname === `${ratingsHref}/` || (pathname?.startsWith(`${ratingsHref}/`) ?? false);
  const weeklyRatingBlocking = !!status?.weeklyRating?.blocking;
  const showClockInRequiredGate = !!(
    status?.applicable &&
    !status.clock &&
    !onTimeClockPage &&
    !(weeklyRatingBlocking && onRatingsPage)
  );

  useEffect(() => {
    if (!showClockInRequiredGate) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [showClockInRequiredGate]);

  const refresh = useCallback(async (): Promise<TimeClockStatus | null> => {
    try {
      const r = await fetch('/api/time-clock/status', { cache: 'no-store', credentials: 'include' });
      if (!r.ok) {
        const errBody = (await r.json().catch(() => ({}))) as { error?: string; detail?: string };
        throw new Error(errBody.detail ?? errBody.error ?? `status_${r.status}`);
      }
      const j = (await r.json()) as TimeClockStatus;
      setStatus(j);
      setErr(null);
      return j;
    } catch {
      setErr(t.timeClock.loadStatusFailed);
      return null;
    }
  }, [t.timeClock.loadStatusFailed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onWake = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener(APP_RESUME_EVENT, onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener(APP_RESUME_EVENT, onWake);
    };
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('forceAway') === '1') setForceAwayOpen(true);
  }, [pathname]);

  const branch = status?.branch;
  const locationConsentOk = !!status?.consent?.location;
  const pushConsentOk = !!status?.consent?.push;
  const geoWatchEnabled = !!(
    status?.applicable &&
    status?.autoGeofenceClockIn &&
    branch?.hasGeofence &&
    branch.latitude != null &&
    branch.longitude != null &&
    locationConsentOk
  );

  const readCurrentPosition = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    if (pos) return Promise.resolve(pos);
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    });
  }, [pos]);

  const closeForcedAwayModal = useCallback(() => {
    setForceAwayOpen(false);
    exitCheckRaisedRef.current = false;
    outsideStreakRef.current = 0;
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('forceAway') === '1') {
      sp.delete('forceAway');
      const q = sp.toString();
      const path = pathname || window.location.pathname;
      router.replace(q ? `${path}?${q}` : path);
    }
  }, [router, pathname]);

  const dismissForcedAwayModal = useCallback(() => {
    forceAwayDismissedUntilRef.current = Date.now() + FORCE_AWAY_DISMISS_COOLDOWN_MS;
    closeForcedAwayModal();
  }, [closeForcedAwayModal]);

  const considerForceAwayPrompt = useCallback(async () => {
    if (exitCheckRaisedRef.current || forceAwayOpen) return;
    if (Date.now() < forceAwayDismissedUntilRef.current) {
      outsideStreakRef.current = 0;
      return;
    }
    const s = await fetch('/api/time-clock/status', { cache: 'no-store', credentials: 'include' }).then(
      (r) => r.json() as Promise<TimeClockStatus>
    );
    if (!s.clock || s.away || !s.branch?.hasGeofence) {
      outsideStreakRef.current = 0;
      return;
    }
    outsideStreakRef.current += 1;
    if (outsideStreakRef.current < PRESENCE_OUTSIDE_STREAK) return;
    exitCheckRaisedRef.current = true;
    setAwayNotice(null);
    setForceAwayOpen(true);
  }, [forceAwayOpen]);

  const onGeoTransition = useCallback(
    async (kind: 'enter' | 'exit', lat: number, lng: number) => {
      if (kind === 'enter') {
        const st = await refresh();
        if (st && st.applicable && st.autoGeofenceClockIn && st.branch?.hasGeofence && !st.clock) {
          await postAutoClockInWithRetries(lat, lng);
        }
      }

      const payload = await postLocationEvent(kind, lat, lng);
      await refresh();
      if (kind === 'exit') {
        let shouldPromptAway = payload.action === 'destination_required';
        if (!shouldPromptAway) {
          const check = await fetch('/api/time-clock/presence-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          });
          if (check.ok) {
            const j = (await check.json()) as { triggerAway?: boolean };
            shouldPromptAway = !!j.triggerAway;
          }
        }
        if (!shouldPromptAway) {
          outsideStreakRef.current = 0;
          return;
        }
        await considerForceAwayPrompt();
      }
      if (kind === 'enter') {
        // Always hit reenter on enter: server no-ops if there is no active away (avoids stale client status).
        await fetch('/api/time-clock/away/reenter', { method: 'POST' });
        await refresh();
        // Back inside geofence: close forced-away UI and countdown; away timer canceled server-side.
        setAwayNotice(null);
        setOtherText('');
        exitCheckRaisedRef.current = false;
        closeForcedAwayModal();
      }
    },
    [refresh, closeForcedAwayModal, considerForceAwayPrompt]
  );

  const onGeoError = useCallback((message: string) => {
    setErr(message);
  }, []);

  const geoMessages = useMemo(
    () => ({
      permissionDenied: t.timeClock.geoPermissionDenied,
      unavailable: t.timeClock.geoUnavailable,
      timedOut: t.timeClock.geoTimedOut,
    }),
    [t.timeClock.geoPermissionDenied, t.timeClock.geoUnavailable, t.timeClock.geoTimedOut]
  );

  useGeofenceWatch({
    enabled: geoWatchEnabled,
    branchLat: branch?.latitude ?? null,
    branchLng: branch?.longitude ?? null,
    radiusM: branch?.geofenceRadiusM ?? 25,
    onPosition: setPos,
    onTransition: onGeoTransition,
    onError: onGeoError,
    geoMessages,
  });

  useEffect(() => {
    if (!geoWatchEnabled || !pos || branch?.latitude == null || branch?.longitude == null) return;
    if (status?.clock) return;

    const inside = isInsideBranchRadius(
      pos.lat,
      pos.lng,
      branch.latitude,
      branch.longitude,
      branch.geofenceRadiusM ?? 25
    );
    if (!inside) return;

    let cancelled = false;
    const reconcile = async () => {
      if (cancelled) return;
      const st = await refresh();
      if (!st?.autoGeofenceClockIn || st.clock) return;
      await postAutoClockInWithRetries(pos.lat, pos.lng);
      await postLocationEvent('enter', pos.lat, pos.lng);
      if (!cancelled) await refresh();
    };

    void reconcile();
    const stop = setForegroundInterval(() => void reconcile(), AUTO_CLOCK_IN_RECONCILE_MS);
    return () => {
      cancelled = true;
      stop();
    };
  }, [geoWatchEnabled, pos, status?.clock, branch, refresh]);

  useEffect(() => {
    if (!status?.applicable || !status?.geofenceExempt || !locationConsentOk) return;
    let cancelled = false;
    function read() {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (cancelled) return;
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 120000, timeout: 25000 }
      );
    }
    read();
    const stop = setForegroundInterval(read, 30000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [status?.applicable, status?.geofenceExempt, locationConsentOk]);

  useEffect(() => {
    if (!geoWatchEnabled || !status?.clock || status.away || forceAwayOpen) {
      exitCheckRaisedRef.current = false;
      return;
    }
    const stop = setForegroundInterval(() => {
      if (!isAppForeground()) return;
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setPos({ lat, lng });
          if (exitCheckRaisedRef.current) return;
          if (Date.now() < forceAwayDismissedUntilRef.current) {
            outsideStreakRef.current = 0;
            return;
          }
          const r = await fetch('/api/time-clock/presence-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          });
          if (!r.ok) return;
          const j = (await r.json()) as { triggerAway?: boolean };
          if (!j.triggerAway) {
            outsideStreakRef.current = 0;
            return;
          }
          await considerForceAwayPrompt();
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }, PRESENCE_CHECK_INTERVAL_MS);
    return () => stop();
  }, [geoWatchEnabled, status?.clock, status?.away, forceAwayOpen, considerForceAwayPrompt]);

  /** iOS native background GPS while clocked in (survives app switch / screen lock). */
  useEffect(() => {
    if (
      !geoWatchEnabled ||
      !status?.clock ||
      status.away ||
      branch?.latitude == null ||
      branch?.longitude == null
    ) {
      void stopNativeBackgroundGeofence();
      return;
    }

    void startNativeBackgroundGeofence({
      branchLat: branch.latitude,
      branchLng: branch.longitude,
      radiusM: branch.geofenceRadiusM ?? 25,
      onTransition: onGeoTransition,
      onError: (code) => {
        if (code === 'NOT_AUTHORIZED') setErr(t.timeClock.geoPermissionDenied);
      },
    });

    return () => {
      void stopNativeBackgroundGeofence();
    };
  }, [
    geoWatchEnabled,
    status?.clock,
    status?.away,
    branch?.latitude,
    branch?.longitude,
    branch?.geofenceRadiusM,
    onGeoTransition,
    t.timeClock.geoPermissionDenied,
  ]);

  useEffect(() => {
    if (!pushConsentOk) return;
    let cancelled = false;
    void ensurePushRegistered({ requestPermission: false }).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [pushConsentOk]);

  const value = useMemo(
    () => ({
      status,
      refresh,
      err,
      setErr,
      pos,
    }),
    [status, refresh, err, pos]
  );

  return (
    <TimeClockGeofenceContext.Provider value={value}>
      {children}
      {showClockInRequiredGate && (
        <div className="fixed top-[calc(9rem+env(safe-area-inset-top))] sm:top-[calc(6rem+env(safe-area-inset-top))] end-4 z-[220] pointer-events-auto w-[min(92vw,420px)] app-animate-in">
          <div
            className="rounded-ios-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-900/25 p-4 shadow-lg"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">{t.timeClock.clockInRequiredTitle}</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{t.timeClock.clockInRequiredBody}</p>
              </div>
              <Link
                href={timeClockHref}
                className="shrink-0 rounded-ios border border-amber-300/70 dark:border-amber-500/40 px-2 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
              >
                {t.timeClock.goToClockIn}
              </Link>
            </div>
          </div>
        </div>
      )}
      {forceAwayOpen && status?.clock && !status.away && (
        <ForcedAwayModal
          onEndShift={async () => {
            if (endShiftSubmitting || awayActionInFlightRef.current) return;
            awayActionInFlightRef.current = true;
            setEndShiftSubmitting(true);
            try {
              const coords = await readCurrentPosition();
              if (!coords) {
                setErr(t.timeClock.endShiftGpsRequired);
                return;
              }
              const ctl = new AbortController();
              const to = window.setTimeout(() => ctl.abort(), 12000);
              const r = await fetch('/api/time-clock/clock-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lat: coords.lat,
                  lng: coords.lng,
                  fromGeofenceExitPrompt: true,
                }),
                signal: ctl.signal,
              });
              window.clearTimeout(to);
              if (!r.ok) {
                const e = (await r.json().catch(() => ({}))) as { error?: string };
                setErr(e.error ?? t.timeClock.endShiftFailed);
                await refresh();
                return;
              }
              setAwayNotice(null);
              setOtherText('');
              exitCheckRaisedRef.current = false;
              closeForcedAwayModal();
              await refresh();
            } catch {
              setErr(t.timeClock.endShiftFailed);
            } finally {
              awayActionInFlightRef.current = false;
              setEndShiftSubmitting(false);
            }
          }}
          endShiftLoading={endShiftSubmitting}
          onPick={async (kind: 'break' | 'bathroom' | 'other', note?: string) => {
            if (awaySubmitting || awayActionInFlightRef.current) return;
            awayActionInFlightRef.current = true;
            setAwaySubmitting(true);
            try {
              const ctl = new AbortController();
              const to = window.setTimeout(() => ctl.abort(), 12000);
              const r = await fetch('/api/time-clock/away', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, otherNote: note }),
                signal: ctl.signal,
              });
              window.clearTimeout(to);
              if (!r.ok) {
                const e = await r.json().catch(() => ({}));
                const msg = (e as { error?: string }).error ?? 'Error';
                if (msg.toLowerCase().includes('already active')) {
                  setForceAwayOpen(false);
                  await refresh();
                  return;
                }
                setErr(msg);
                await refresh();
                return;
              }
              const minutes = awayMinutesByKind[kind];
              setAwayNotice(t.timeClock.reportCountdown.replace('{minutes}', String(minutes)));
              await refresh();
            } catch {
              setErr(t.timeClock.awaySubmitFailed);
            } finally {
              awayActionInFlightRef.current = false;
              setAwaySubmitting(false);
            }
          }}
          otherText={otherText}
          setOtherText={setOtherText}
          loading={awaySubmitting}
          notice={awayNotice}
          onClose={dismissForcedAwayModal}
          t={t}
        />
      )}
    </TimeClockGeofenceContext.Provider>
  );
}

/** Runs geofence watch + 3s presence checks + forced-away modal on every dashboard page while applicable. */
export function TimeClockGeofenceProvider({ children, role }: { children: ReactNode; role: string }) {
  if (normalizeUserRole(role) === 'owner') {
    return <>{children}</>;
  }
  return <TimeClockGeofenceProviderInner>{children}</TimeClockGeofenceProviderInner>;
}
