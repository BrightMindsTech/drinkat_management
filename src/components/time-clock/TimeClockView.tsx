'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTimeClockGeofence } from '@/contexts/TimeClockGeofenceContext';
import type { TimeClockStatus } from '@/components/time-clock/geofence-shared';

type ManagerLog = {
  id: string;
  when: string;
  employeeId: string;
  employeeName: string;
  type: 'clock_in' | 'clock_out' | 'away_started';
  details: string;
  reportedToOwner: boolean;
};

type ManagerAlert = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  employeeId: string | null;
  employeeName: string | null;
  type: 'clock_in' | 'clock_out' | 'away_started';
  details: string;
  reportedToOwner: boolean;
};

function hiddenEmployeesStorageKey(managerUserId: string) {
  return `drinkat:tc-manager-hidden-employees:${managerUserId}`;
}

function readHiddenEmployeeIds(managerUserId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(hiddenEmployeesStorageKey(managerUserId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeHiddenEmployeeIds(managerUserId: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(hiddenEmployeesStorageKey(managerUserId), JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

function minuteOfDayToHm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatShiftRange(
  shift: TimeClockStatus['shift'],
  t: { timeClock: { shiftNextDay: string; shiftNotSet: string } }
): string {
  if (!shift) return t.timeClock.shiftNotSet;
  const a = minuteOfDayToHm(shift.startMinute);
  const b = minuteOfDayToHm(shift.endMinute);
  if (!shift.crossesMidnight) return `${a} – ${b}`;
  return `${a} – ${b} (${t.timeClock.shiftNextDay})`;
}

function useWallClock(timeZone: string, locale: 'en' | 'ar') {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    const loc = locale === 'ar' ? 'ar-JO' : 'en-GB';
    return new Intl.DateTimeFormat(loc, {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
  }, [now, timeZone, locale]);
}

export function TimeClockView({
  isManager = false,
  managerUserId,
  managerLogs = [],
  managerAlerts = [],
}: {
  isManager?: boolean;
  /** When set (manager role), employee cards cleared from logs stay hidden across refresh (localStorage). */
  managerUserId?: string;
  managerLogs?: ManagerLog[];
  managerAlerts?: ManagerAlert[];
}) {
  const { t, locale } = useLanguage();
  const { status, refresh, err, setErr, pos } = useTimeClockGeofence();
  const [loading, setLoading] = useState(false);
  const [reportingLogId, setReportingLogId] = useState<string | null>(null);
  const [reportingAlertId, setReportingAlertId] = useState<string | null>(null);
  const [managerLogsState, setManagerLogsState] = useState<ManagerLog[]>(managerLogs);
  const [reportedLogIds, setReportedLogIds] = useState<Set<string>>(new Set());
  const [reportedAlertIds, setReportedAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isManager || !managerUserId) {
      setManagerLogsState(managerLogs);
      return;
    }
    const hidden = readHiddenEmployeeIds(managerUserId);
    setManagerLogsState(managerLogs.filter((r) => !hidden.has(r.employeeId)));
  }, [managerLogs, isManager, managerUserId]);
  useEffect(() => {
    setReportedLogIds(new Set(managerLogs.filter((x) => x.reportedToOwner).map((x) => x.id)));
  }, [managerLogs]);
  useEffect(() => {
    setReportedAlertIds(new Set(managerAlerts.filter((x) => x.reportedToOwner).map((x) => x.id)));
  }, [managerAlerts]);

  const branch = status?.branch;
  const consentOk = !!(status?.consent?.location && status?.consent?.push);
  const geoOk = !!(
    branch?.hasGeofence &&
    branch.latitude != null &&
    branch.longitude != null &&
    consentOk
  );

  const wallClock = useWallClock(status?.displayTimeZone ?? 'Asia/Amman', locale);
  const groupedManagerLogs = useMemo(() => {
    const byEmployee = new Map<string, ManagerLog[]>();
    for (const row of managerLogsState) {
      const arr = byEmployee.get(row.employeeName) ?? [];
      arr.push(row);
      byEmployee.set(row.employeeName, arr);
    }
    return Array.from(byEmployee.entries()).map(([employeeName, rows]) => ({
      employeeName,
      rows,
    }));
  }, [managerLogsState]);

  if (!status) {
    return (
      <div className="space-y-2">
        <div className="text-app-secondary">{t.common.loading}</div>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    );
  }

  if (!status.applicable) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-ios-dark-separator p-4 text-app-secondary">
        {t.timeClock.notApplicable}
      </div>
    );
  }

  const tz = status.displayTimeZone ?? 'Asia/Amman';

  return (
    <div className="space-y-6 scroll-mt-28" id="section-tc-main">
      <header className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-app-secondary">{t.timeClock.title}</p>
          <h1 className="text-2xl font-semibold text-app-label">
            {status.employeeName?.trim() || t.timeClock.title}
          </h1>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white/60 dark:bg-ios-dark-elevated/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-app-secondary mb-1">{t.timeClock.currentTime}</p>
            <p className="text-xl font-mono tabular-nums tracking-tight text-app-label">{wallClock}</p>
            <p className="text-[11px] text-app-secondary mt-1 opacity-80">{tz}</p>
          </div>
          <div>
            <p className="text-xs text-app-secondary mb-1">{t.timeClock.yourShift}</p>
            <p className="text-lg font-medium text-app-label">
              {formatShiftRange(status.shift, t)}
            </p>
          </div>
        </div>
      </header>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <ConsentBlock status={status} onUpdated={refresh} />

      {geoOk && branch && (
        <p className="text-sm text-app-secondary">
          {branch.name} · {pos ? t.timeClock.positionOk : t.timeClock.waitingGps}
        </p>
      )}

      <ClockActions
        status={status}
        pos={pos}
        loading={loading}
        setLoading={setLoading}
        setErr={setErr}
        onRefresh={refresh}
        t={t}
      />

      {status.away && (
        <AwayBanner endsAt={status.away.endsAt} kind={status.away.kind} onRefresh={refresh} t={t} />
      )}

      {isManager && (
        <section id="section-tc-alerts" className="scroll-mt-28 rounded-xl border border-gray-200 dark:border-ios-dark-separator overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated">
            <h2 className="text-sm font-semibold text-app-label">{t.timeClock.clockAlertsTitle}</h2>
          </div>
          <div className="p-3 space-y-2">
            {managerAlerts.length === 0 ? (
              <p className="text-sm text-app-secondary">{t.timeClock.noClockAlertsYet}</p>
            ) : (
              managerAlerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-gray-100 dark:border-ios-dark-separator px-3 py-2">
                  <p className="text-sm font-semibold text-app-label">{a.title}</p>
                  <p className="text-sm text-app-secondary mt-0.5">{a.body}</p>
                  <p className="text-xs text-app-muted mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                  <button
                    type="button"
                    disabled={
                      reportingAlertId === a.id || reportedAlertIds.has(a.id) || !a.employeeId || !a.employeeName
                    }
                    className="mt-2 rounded-lg border border-ios-blue/40 px-2.5 py-1 text-xs font-medium text-ios-blue disabled:opacity-50"
                    onClick={async () => {
                      if (!a.employeeId || !a.employeeName) return;
                      setReportingAlertId(a.id);
                      try {
                        const res = await fetch('/api/time-clock/report-to-owner', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            logId: `alert-${a.id}`,
                            employeeId: a.employeeId,
                            employeeName: a.employeeName,
                            when: a.createdAt,
                            type: a.type,
                            details: a.details,
                          }),
                        });
                        if (!res.ok) {
                          const e = await res.json().catch(() => ({}));
                          setErr((e as { error?: string }).error ?? t.timeClock.reportToOwnerFailed);
                          return;
                        }
                        setReportedAlertIds((prev) => {
                          const next = new Set(prev);
                          next.add(a.id);
                          return next;
                        });
                      } finally {
                        setReportingAlertId(null);
                      }
                    }}
                  >
                    {reportedAlertIds.has(a.id) ? t.timeClock.reportedToOwner : t.timeClock.reportToOwner}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {isManager && (
        <section id="section-tc-logs" className="scroll-mt-28 rounded-xl border border-gray-200 dark:border-ios-dark-separator overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated">
            <h2 className="text-sm font-semibold text-app-label">{t.timeClock.employeeLogsTitle}</h2>
          </div>
          <div className="p-3">
            {groupedManagerLogs.length === 0 ? (
              <p className="text-sm text-app-secondary">{t.timeClock.noEmployeeLogsYet}</p>
            ) : (
              <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                {groupedManagerLogs.map((group) => (
                  <div
                    key={group.rows[0]?.employeeId ?? group.employeeName}
                    className="snap-start shrink-0 w-[92%] sm:w-[70%] lg:w-[55%] rounded-lg border border-gray-100 dark:border-ios-dark-separator"
                  >
                    <div className="px-3 py-2 text-sm font-semibold text-app-label bg-gray-50 dark:bg-ios-dark-elevated">
                      <div className="flex items-center justify-between gap-3">
                        <span>{group.employeeName}</span>
                        <button
                          type="button"
                          className="rounded-lg border border-red-300/70 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-300"
                          onClick={async () => {
                            const employeeId = group.rows[0]?.employeeId;
                            if (!employeeId) return;
                            try {
                              const res = await fetch('/api/time-clock/manager-log-hidden', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ employeeId }),
                              });
                              if (!res.ok) {
                                const e = (await res.json().catch(() => ({}))) as { error?: string };
                                setErr(e.error ?? t.timeClock.reportToOwnerFailed);
                              }
                            } catch {
                              // Keep local fallback to avoid blocking UX when network fails.
                            }
                            if (managerUserId) {
                              const hidden = readHiddenEmployeeIds(managerUserId);
                              hidden.add(employeeId);
                              writeHiddenEmployeeIds(managerUserId, hidden);
                            }
                            setManagerLogsState((prev) => prev.filter((x) => x.employeeId !== employeeId));
                          }}
                        >
                          {t.timeClock.clearReports}
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-ios-dark-separator">
                      {group.rows.map((r) => (
                        <div key={r.id} className="px-3 py-2 text-sm">
                          <p className="text-app-label">{r.details}</p>
                          <p className="text-xs text-app-secondary">
                            {new Date(r.when).toLocaleString()} · {r.type}
                          </p>
                          <button
                            type="button"
                            disabled={reportingLogId === r.id || reportedLogIds.has(r.id)}
                            className="mt-2 rounded-lg border border-ios-blue/40 px-2.5 py-1 text-xs font-medium text-ios-blue disabled:opacity-50"
                            onClick={async () => {
                              setReportingLogId(r.id);
                              try {
                                const res = await fetch('/api/time-clock/report-to-owner', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    logId: r.id,
                                    employeeId: r.employeeId,
                                    employeeName: r.employeeName,
                                    when: r.when,
                                    type: r.type,
                                    details: r.details,
                                  }),
                                });
                                if (!res.ok) {
                                  const e = await res.json().catch(() => ({}));
                                  setErr((e as { error?: string }).error ?? t.timeClock.reportToOwnerFailed);
                                  return;
                                }
                                setReportedLogIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(r.id);
                                  return next;
                                });
                              } finally {
                                setReportingLogId(null);
                              }
                            }}
                          >
                            {reportedLogIds.has(r.id) ? t.timeClock.reportedToOwner : t.timeClock.reportToOwner}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

    </div>
  );
}

function ConsentBlock({ status, onUpdated }: { status: TimeClockStatus; onUpdated: () => void }) {
  const { t } = useLanguage();
  const [loc, setLoc] = useState(!!status.consent?.location);
  const [push, setPush] = useState(!!status.consent?.push);
  const [busy, setBusy] = useState(false);

  if (status.consent?.location && status.consent?.push) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-4 space-y-3">
      <p className="text-sm font-medium text-app-label">{t.timeClock.consentTitle}</p>
      <p className="text-xs text-app-secondary">{t.timeClock.consentBody}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={loc} onChange={(e) => setLoc(e.target.checked)} />
        {t.timeClock.consentLocation}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
        {t.timeClock.consentPush}
      </label>
      <button
        type="button"
        disabled={busy || !loc || !push}
        className="rounded-lg bg-ios-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            await new Promise<void>((res, rej) => {
              navigator.geolocation.getCurrentPosition(() => res(), rej, { timeout: 20000 });
            });
            if ('Notification' in window && Notification.permission === 'default') {
              await Notification.requestPermission();
            }
            await fetch('/api/time-clock/consent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location: loc, push }),
            });
            if (push && 'serviceWorker' in navigator) {
              await navigator.serviceWorker.register('/sw.js');
              const v = await fetch('/api/push/vapid-public').then((r) => r.json());
              if (v.configured && v.publicKey && Notification.permission === 'granted') {
                await subscribeWebPush(v.publicKey);
              }
            }
            await onUpdated();
          } catch {
            setBusy(false);
            return;
          }
          setBusy(false);
        }}
      >
        {t.timeClock.saveConsent}
      </button>
    </div>
  );
}

function ClockActions({
  status,
  pos,
  loading,
  setLoading,
  setErr,
  onRefresh,
  t,
}: {
  status: TimeClockStatus;
  pos: { lat: number; lng: number } | null;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setErr: (s: string | null) => void;
  onRefresh: () => void | Promise<void>;
  t: { timeClock: Record<string, string>; common: Record<string, string> };
}) {
  const [cashFormGateHref, setCashFormGateHref] = useState<string | null>(null);
  const [weeklyRatingsGateHref, setWeeklyRatingsGateHref] = useState<string | null>(null);

  if (!status.consent?.location) return null;
  if (!status.branch?.hasGeofence) {
    return <p className="text-sm text-amber-700 dark:text-amber-400">{t.timeClock.branchPendingCoords}</p>;
  }

  const canAct = !!pos;

  return (
    <>
    {status.weeklyRating?.blocking ? (
      <p className="text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-300/60 dark:border-amber-700/50 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2">
        {t.timeClock.weeklyRatingBlockingHint}
      </p>
    ) : null}
    <div className="flex flex-wrap gap-3">
      {!status.clock ? (
        <button
          type="button"
          disabled={loading || !canAct}
          className="rounded-xl bg-green-600 px-5 py-2.5 text-white font-medium disabled:opacity-50"
          onClick={async () => {
            if (!pos) return;
            setLoading(true);
            setErr(null);
            const r = await fetch('/api/time-clock/clock-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
            });
            setLoading(false);
            if (!r.ok) {
              const e = (await r.json().catch(() => ({}))) as {
                error?: string;
                code?: string;
                ratingsPath?: string;
              };
              if (e.code === 'weekly_rating_required') {
                setWeeklyRatingsGateHref(
                  typeof e.ratingsPath === 'string' && e.ratingsPath.length > 0
                    ? e.ratingsPath
                    : '/dashboard/ratings'
                );
                return;
              }
              setErr(e.error ?? t.timeClock.clockInFailed);
              return;
            }
            await onRefresh();
          }}
        >
          {t.timeClock.clockIn}
        </button>
      ) : (
        <button
          type="button"
          disabled={loading || !canAct}
          className="rounded-xl bg-gray-700 dark:bg-ios-dark-fill px-5 py-2.5 text-white font-medium disabled:opacity-50"
          onClick={async () => {
            if (!pos) return;
            setLoading(true);
            setErr(null);
            const r = await fetch('/api/time-clock/clock-out', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: pos.lat, lng: pos.lng }),
            });
            setLoading(false);
            if (!r.ok) {
              const e = (await r.json().catch(() => ({}))) as {
                error?: string;
                code?: string;
                formsPath?: string;
                ratingsPath?: string;
              };
              if (e.code === 'weekly_rating_required') {
                setWeeklyRatingsGateHref(
                  typeof e.ratingsPath === 'string' && e.ratingsPath.length > 0
                    ? e.ratingsPath
                    : '/dashboard/ratings'
                );
                return;
              }
              if (e.code === 'cash_form_required') {
                setCashFormGateHref(
                  typeof e.formsPath === 'string' && e.formsPath.length > 0
                    ? e.formsPath
                    : '/dashboard/forms#section-forms-available'
                );
                return;
              }
              setErr(e.error ?? t.timeClock.clockOutFailed);
              return;
            }
            await onRefresh();
          }}
        >
          {t.timeClock.clockOut}
        </button>
      )}
    </div>
    {weeklyRatingsGateHref ? (
      <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-rating-gate-title"
      >
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-ios-dark-elevated p-6 shadow-xl space-y-4">
          <h2 id="weekly-rating-gate-title" className="text-lg font-semibold text-app-label">
            {t.timeClock.weeklyRatingRequiredTitle}
          </h2>
          <p className="text-sm text-app-secondary">{t.timeClock.weeklyRatingRequiredBody}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-gray-300 dark:border-ios-dark-separator px-4 py-2.5 text-sm font-medium text-app-primary"
              onClick={() => setWeeklyRatingsGateHref(null)}
            >
              {t.common.cancel}
            </button>
            <Link
              href={weeklyRatingsGateHref}
              className="rounded-xl bg-ios-blue px-4 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setWeeklyRatingsGateHref(null)}
            >
              {t.timeClock.weeklyRatingGoToRatings}
            </Link>
          </div>
        </div>
      </div>
    ) : null}
    {cashFormGateHref ? (
      <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-form-gate-title"
      >
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-ios-dark-elevated p-6 shadow-xl space-y-4">
          <h2 id="cash-form-gate-title" className="text-lg font-semibold text-app-label">
            {t.timeClock.cashFormRequiredTitle}
          </h2>
          <p className="text-sm text-app-secondary">{t.timeClock.cashFormRequiredBody}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-gray-300 dark:border-ios-dark-separator px-4 py-2.5 text-sm font-medium text-app-primary"
              onClick={() => setCashFormGateHref(null)}
            >
              {t.common.cancel}
            </button>
            <Link
              href={cashFormGateHref}
              className="rounded-xl bg-ios-blue px-4 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setCashFormGateHref(null)}
            >
              {t.timeClock.cashFormGoToForms}
            </Link>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function AwayBanner({
  endsAt,
  kind,
  onRefresh,
  t,
}: {
  endsAt: string;
  kind: string;
  onRefresh: () => void | Promise<void>;
  t: { timeClock: Record<string, string> };
}) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      void onRefresh();
    }, 15000);
    return () => {
      clearInterval(i);
      clearInterval(poll);
    };
  }, [onRefresh]);

  const left = Math.max(0, Math.floor((end - now) / 1000));
  const mm = Math.floor(left / 60);
  const ss = left % 60;

  return (
    <div className="rounded-xl border border-ios-blue/40 bg-blue-50/80 dark:bg-blue-950/30 p-4 text-sm">
      <p className="font-medium text-app-label">
        {t.timeClock.awayActive}: {kind} · {mm}:{String(ss).padStart(2, '0')}
      </p>
    </div>
  );
}

