'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import type { OwnerLiveAttendanceRow } from '@/lib/time-clock-owner-live';

export function OwnerLiveAttendanceSection({ initialRows }: { initialRows: OwnerLiveAttendanceRow[] }) {
  const { t, locale } = useLanguage();
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/time-clock/owner-live-attendance', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { rows: OwnerLiveAttendanceRow[] };
      setRows(j.rows ?? []);
    } catch {
      setErr(t.hr.liveAttendanceRefreshFailed);
    } finally {
      setLoading(false);
    }
  }, [t.hr.liveAttendanceRefreshFailed]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refresh();
    }, 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const clockedIn = useMemo(() => rows.filter((r) => r.clockedIn), [rows]);
  const notIn = useMemo(() => rows.filter((r) => !r.clockedIn), [rows]);

  const formatSince = (iso: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  };

  const sectionClass = 'app-section scroll-mt-28';

  return (
    <section id="hr-owner-live-attendance" className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-app-primary">{t.hr.liveAttendanceTitle}</h2>
          <p className="text-sm text-app-muted mt-0.5">
            {interpolate(t.hr.liveAttendanceSummary, {
              in: String(clockedIn.length),
              out: String(notIn.length),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="app-btn-secondary text-sm disabled:opacity-50"
        >
          {loading ? t.common.loading : t.hr.refreshLiveAttendance}
        </button>
      </div>
      {err && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{err}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-app-primary mb-2">{t.hr.clockedInNow}</h3>
          {clockedIn.length === 0 ? (
            <p className="text-sm text-app-muted">{t.common.noData}</p>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr className="app-table-head">
                    <th className="text-left p-2">{t.common.employee}</th>
                    <th className="text-left p-2">{t.common.branch}</th>
                    <th className="text-left p-2">{t.hr.sinceClockIn}</th>
                  </tr>
                </thead>
                <tbody>
                  {clockedIn.map((row, i) => (
                    <tr
                      key={row.employeeId}
                      className={`border-t border-gray-200 dark:border-ios-dark-separator ${
                        i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'
                      }`}
                    >
                      <td className="p-2 font-medium text-app-primary">{row.name}</td>
                      <td className="p-2 text-app-secondary">{row.branchName}</td>
                      <td className="p-2 text-sm tabular-nums text-app-secondary">
                        <span>{formatSince(row.clockInAt)}</span>
                        {row.clockedAtBranchName && row.clockedAtBranchName !== row.branchName && (
                          <span className="block text-xs text-app-muted mt-0.5">
                            {interpolate(t.hr.clockedAtSite, { branch: row.clockedAtBranchName })}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-app-primary mb-2">{t.hr.notClockedIn}</h3>
          {notIn.length === 0 ? (
            <p className="text-sm text-app-muted">{t.common.noData}</p>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr className="app-table-head">
                    <th className="text-left p-2">{t.common.employee}</th>
                    <th className="text-left p-2">{t.common.branch}</th>
                  </tr>
                </thead>
                <tbody>
                  {notIn.map((row, i) => (
                    <tr
                      key={row.employeeId}
                      className={`border-t border-gray-200 dark:border-ios-dark-separator ${
                        i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'
                      }`}
                    >
                      <td className="p-2 font-medium text-app-primary">{row.name}</td>
                      <td className="p-2 text-app-secondary">{row.branchName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
