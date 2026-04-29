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
import { isCapacitorIos, registerIosPushWithBackend } from '@/lib/native-push-client';
import { subscribeWebPush } from '@/lib/web-push-client';
import { ForcedAwayModal, useGeofenceWatch, type TimeClockStatus } from '@/components/time-clock/geofence-shared';

const awayMinutesByKind: Record<'break' | 'bathroom' | 'other', number> = {
  break: 30,
  bathroom: 10,
  other: 10,
};

export type TimeClockGeofenceContextValue = {
  status: TimeClockStatus | null;
  refresh: () => Promise<void>;
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
  const exitCheckRaisedRef = useRef(false);

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

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/time-clock/status');
      if (!r.ok) throw new Error(`status_${r.status}`);
      const j = (await r.json()) as TimeClockStatus;
      setStatus(j);
      setErr(null);
    } catch {
      setErr(t.timeClock.loadStatusFailed);
    }
  }, [t.timeClock.loadStatusFailed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('forceAway') === '1') setForceAwayOpen(true);
  }, [pathname]);

  const branch = status?.branch;
  const locationConsentOk = !!status?.consent?.location;
  const pushConsentOk = !!status?.consent?.push;
  const geoOk = !!(
    status?.applicable &&
    branch?.hasGeofence &&
    branch.latitude != null &&
    branch.longitude != null &&
    locationConsentOk
  );

  const closeForcedAwayModal = useCallback(() => {
    setForceAwayOpen(false);
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('forceAway') === '1') {
      sp.delete('forceAway');
      const q = sp.toString();
      const path = pathname || window.location.pathname;
      router.replace(q ? `${path}?${q}` : path);
    }
  }, [router, pathname]);

  const onGeoTransition = useCallback(
    async (kind: 'enter' | 'exit', lat: number, lng: number) => {
      let payload: { action?: string; inside?: boolean } = {};
      try {
        const res = await fetch('/api/time-clock/location-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, lat, lng }),
        });
        payload = (await res.json().catch(() => ({}))) as { action?: string; inside?: boolean };
      } catch {
        payload = {};
      }
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
        if (!shouldPromptAway) return;
        const s = await fetch('/api/time-clock/status').then((r) => r.json() as Promise<TimeClockStatus>);
        if (s.clock && !s.away && s.branch?.hasGeofence) {
          setAwayNotice(null);
          setForceAwayOpen(true);
        }
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
    [refresh, closeForcedAwayModal]
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
    enabled: geoOk,
    branchLat: branch?.latitude ?? null,
    branchLng: branch?.longitude ?? null,
    radiusM: branch?.geofenceRadiusM ?? 25,
    onPosition: setPos,
    onTransition: onGeoTransition,
    onError: onGeoError,
    geoMessages,
  });

  useEffect(() => {
    if (!geoOk || !status?.clock || status.away || forceAwayOpen) {
      exitCheckRaisedRef.current = false;
      return;
    }
    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (p) => {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          setPos({ lat, lng });
          if (exitCheckRaisedRef.current) return;
          const r = await fetch('/api/time-clock/presence-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          });
          if (!r.ok) return;
          const j = (await r.json()) as { triggerAway?: boolean };
          if (!j.triggerAway) return;
          exitCheckRaisedRef.current = true;
          setAwayNotice(null);
          setForceAwayOpen(true);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    }, 3000);
    return () => window.clearInterval(interval);
  }, [geoOk, status?.clock, status?.away, forceAwayOpen]);

  useEffect(() => {
    if (!pushConsentOk) return;
    let cancelled = false;
    (async () => {
      try {
        if (isCapacitorIos()) {
          if (cancelled) return;
          await registerIosPushWithBackend();
          return;
        }
        if (!('serviceWorker' in navigator)) return;
        await navigator.serviceWorker.register('/sw.js');
        const v = await fetch('/api/push/vapid-public').then((r) => r.json());
        if (!v.configured || !v.publicKey || cancelled) return;
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
        await subscribeWebPush(v.publicKey);
      } catch {
        /* optional */
      }
    })();
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
          onPick={async (kind: 'break' | 'bathroom' | 'other', note?: string) => {
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
              setAwaySubmitting(false);
            }
          }}
          otherText={otherText}
          setOtherText={setOtherText}
          loading={awaySubmitting}
          notice={awayNotice}
          onClose={closeForcedAwayModal}
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
