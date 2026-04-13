'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';

export type OwnerManagerReport = {
  id: string;
  category: 'manager_time_clock_report' | 'manager_form_report';
  title: string;
  body: string;
  createdAt: string;
  reviewedAt: string | null;
  managerName: string;
  employeeName: string;
  branchName: string;
  reportType: string;
  reportAt: string;
  details: string;
};

const CATEGORY_ORDER: OwnerManagerReport['category'][] = ['manager_form_report', 'manager_time_clock_report'];

type FormExtendPayload = {
  kind: 'form';
  submission: {
    id: string;
    status: string;
    submittedAt: string;
    rating: number | null;
    comments: string | null;
    answers: Record<string, string>;
    template: { title: string; fields: { key: string; label: string; type: string }[] };
    employee: { name: string };
    branch: { name: string };
    reportsToManager?: { name: string } | null;
  };
};

type TimeClockExtendPayload = {
  kind: 'time_clock';
  title: string;
  body: string;
  createdAt: string;
  data: Record<string, unknown>;
  timeClockRecord: Record<string, unknown> | null;
};

function formatDataValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function FormSubmissionDetail({
  s,
}: {
  s: FormExtendPayload['submission'];
}) {
  const { t } = useLanguage();
  const m = t.managerReports;
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-base font-semibold text-app-label">{s.template.title}</p>
        <p className="text-app-secondary mt-1">
          <span className="font-medium text-app-primary">{s.employee.name}</span> · {s.branch.name}
        </p>
        {s.reportsToManager?.name ? (
          <p className="text-app-secondary mt-1">
            {m.submittedTo}: <span className="font-medium text-app-primary">{s.reportsToManager.name}</span>
          </p>
        ) : null}
        <p className="text-xs text-app-muted mt-1 tabular-nums">{new Date(s.submittedAt).toLocaleString()}</p>
        <p className="text-xs text-app-muted mt-1">
          {m.statusLabel}: <span className="font-medium">{s.status}</span>
        </p>
      </div>
      <dl className="space-y-2 border-t border-gray-100 dark:border-ios-dark-separator pt-3">
        {s.template.fields.map((f, idx) => (
          <div
            key={f.key}
            className={`grid grid-cols-1 gap-0.5 rounded-md px-2 py-1.5 sm:grid-cols-[minmax(8rem,11rem)_1fr] sm:gap-x-4 sm:items-start ${
              idx % 2 === 0 ? 'bg-gray-50/80 dark:bg-ios-dark-elevated/30' : ''
            }`}
          >
            <dt className="text-app-label leading-snug">{f.label}:</dt>
            <dd className="text-app-primary break-words leading-snug">
              {f.type === 'photo' && s.answers[f.key] ? (
                <a
                  href={s.answers[f.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ios-blue hover:underline"
                >
                  {m.openPhoto}
                </a>
              ) : (
                (s.answers[f.key] ?? '—')
              )}
            </dd>
          </div>
        ))}
      </dl>
      {(s.rating != null || s.comments) && (
        <div className="border-t border-gray-100 dark:border-ios-dark-separator pt-3 space-y-1">
          {s.rating != null ? (
            <p className="text-app-secondary">
              {m.ratingLabel}: <span className="font-medium text-app-primary">{s.rating}/5</span>
            </p>
          ) : null}
          {s.comments ? <p className="text-app-secondary">{s.comments}</p> : null}
        </div>
      )}
    </div>
  );
}

function TimeClockDetailBody({ payload }: { payload: TimeClockExtendPayload }) {
  const { t } = useLanguage();
  const m = t.managerReports;
  const entries = Object.entries(payload.data).filter(([k]) => k !== '__proto__');

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-base font-semibold text-app-label">{payload.title}</p>
        <p className="text-app-secondary mt-2 whitespace-pre-wrap">{payload.body}</p>
        <p className="text-xs text-app-muted mt-2 tabular-nums">
          {m.inboxAt}: {new Date(payload.createdAt).toLocaleString()}
        </p>
      </div>
      {payload.timeClockRecord ? (
        <div className="border-t border-gray-100 dark:border-ios-dark-separator pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-2">{m.linkedRecord}</p>
          <dl className="space-y-1.5">
            {Object.entries(payload.timeClockRecord).map(([k, v]) => (
              <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(7rem,10rem)_1fr] sm:gap-x-3">
                <dt className="text-app-label text-xs">{k}</dt>
                <dd className="text-app-primary break-words text-xs font-mono">{formatDataValue(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <div className="border-t border-gray-100 dark:border-ios-dark-separator pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-2">{m.reportPayload}</p>
        <dl className="space-y-1.5 max-h-48 overflow-y-auto">
          {entries.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[minmax(7rem,10rem)_1fr] sm:gap-x-3">
              <dt className="text-app-label text-xs">{k}</dt>
              <dd className="text-app-primary break-words text-xs">{formatDataValue(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function ReportListItem({
  r,
  busyId,
  onMarkReviewed,
  onExtend,
  m,
}: {
  r: OwnerManagerReport;
  busyId: string | null;
  onMarkReviewed: (id: string) => void;
  onExtend: (id: string) => void;
  m: LocaleMessages['managerReports'];
}) {
  const showOk = !r.reviewedAt;
  return (
    <li className="px-4 py-3">
      <p className="text-sm font-semibold text-app-label">{r.title}</p>
      <p className="text-sm text-app-secondary mt-1">{r.details}</p>
      <p className="text-xs text-app-muted mt-2">
        {m.reportId}: {r.id} · {m.manager}: {r.managerName} · {m.employee}: {r.employeeName} · {m.branch}: {r.branchName}
      </p>
      <p className="text-xs text-app-muted">
        {m.eventType}: {r.reportType} · {m.reportTime}: {new Date(r.reportAt).toLocaleString()}
        {r.reviewedAt ? ` · ${m.reviewedLabel}: ${new Date(r.reviewedAt).toLocaleString()}` : ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onExtend(r.id)}
          className="rounded-lg border border-ios-blue/40 px-3 py-1.5 text-xs font-medium text-ios-blue"
        >
          {m.extend}
        </button>
        {showOk ? (
          <button
            type="button"
            disabled={busyId === r.id}
            onClick={() => onMarkReviewed(r.id)}
            className="rounded-lg bg-ios-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {m.ok}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function ManagerReportsInbox({ initialReports }: { initialReports: OwnerManagerReport[] }) {
  const { t } = useLanguage();
  const m = t.managerReports;
  const [reports, setReports] = useState(initialReports);
  const [search, setSearch] = useState('');
  const [manager, setManager] = useState('');
  const [branch, setBranch] = useState('');
  const [employee, setEmployee] = useState('');
  const [reportType, setReportType] = useState('');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extendPayload, setExtendPayload] = useState<FormExtendPayload | TimeClockExtendPayload | null>(null);
  const extendLayerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!extendId) return;
    const node = extendLayerRef.current;
    if (!node) return;
    const id = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [extendId, extendLoading, extendPayload, extendError]);

  const managerOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.managerName).filter(Boolean))).sort(),
    [reports]
  );
  const branchOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.branchName).filter(Boolean))).sort(),
    [reports]
  );
  const employeeOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.employeeName).filter(Boolean))).sort(),
    [reports]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.reportType).filter(Boolean))).sort(),
    [reports]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    return reports.filter((r) => {
      if (manager && r.managerName !== manager) return false;
      if (branch && r.branchName !== branch) return false;
      if (employee && r.employeeName !== employee) return false;
      if (reportType && r.reportType !== reportType) return false;
      if (timeRange !== 'all') {
        const ts = new Date(r.reportAt).getTime();
        const day = 24 * 60 * 60 * 1000;
        if (timeRange === 'today' && now - ts > day) return false;
        if (timeRange === 'week' && now - ts > 7 * day) return false;
        if (timeRange === 'month' && now - ts > 30 * day) return false;
      }
      if (!q) return true;
      const hay = [
        r.id,
        r.managerName,
        r.employeeName,
        r.reportType,
        r.details,
        r.body,
        r.branchName,
        r.category,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reports, search, manager, branch, employee, reportType, timeRange]);

  async function markReviewed(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/manager-reports/${id}/review`, { method: 'POST' });
      if (!res.ok) return;
      const nowIso = new Date().toISOString();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, reviewedAt: nowIso } : r)));
    } finally {
      setBusyId(null);
    }
  }

  const openExtend = useCallback(
    async (id: string) => {
      setExtendId(id);
      setExtendPayload(null);
      setExtendError(null);
      setExtendLoading(true);
      try {
        const res = await fetch(`/api/manager-reports/${id}/detail`);
        const data = (await res.json().catch(() => ({}))) as FormExtendPayload | TimeClockExtendPayload | { error?: string };
        if (!res.ok) {
          setExtendError((data as { error?: string }).error ?? m.loadFailed);
          return;
        }
        if ((data as FormExtendPayload).kind === 'form' || (data as TimeClockExtendPayload).kind === 'time_clock') {
          setExtendPayload(data as FormExtendPayload | TimeClockExtendPayload);
        } else {
          setExtendError(m.unexpectedResponse);
        }
      } catch {
        setExtendError(m.loadFailed);
      } finally {
        setExtendLoading(false);
      }
    },
    [m.loadFailed, m.unexpectedResponse]
  );

  const closeExtend = useCallback(() => {
    setExtendId(null);
    setExtendPayload(null);
    setExtendError(null);
    setExtendLoading(false);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-app-label">{m.pageTitle}</h1>

      <section className="rounded-xl border border-gray-200 dark:border-ios-dark-separator p-3 space-y-3">
        <input
          className="app-input"
          placeholder={m.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <details className="rounded-lg border border-gray-200 dark:border-ios-dark-separator">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-app-label">{m.filter}</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-ios-dark-separator">
            <select className="app-select" value={manager} onChange={(e) => setManager(e.target.value)}>
              <option value="">{m.allManagers}</option>
              {managerOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select className="app-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">{m.allBranches}</option>
              {branchOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select className="app-select" value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">{m.allEmployees}</option>
              {employeeOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select className="app-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="">{m.allEventTypes}</option>
              {typeOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              className="app-select md:col-span-2"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'all' | 'today' | 'week' | 'month')}
            >
              <option value="all">{m.timeAll}</option>
              <option value="today">{m.timeToday}</option>
              <option value="week">{m.timeWeek}</option>
              <option value="month">{m.timeMonth}</option>
            </select>
          </div>
        </details>
      </section>

      {CATEGORY_ORDER.map((category) => {
        const inCat = filtered.filter((r) => r.category === category);
        if (inCat.length === 0) return null;
        const unreviewed = inCat.filter((r) => !r.reviewedAt);
        const reviewed = inCat.filter((r) => !!r.reviewedAt);
        const heading =
          category === 'manager_form_report' ? m.categoryForm : m.categoryTimeClock;
        const countLine =
          inCat.length === 1 ? m.reportsInCategoryOne : m.reportsInCategoryMany.replace('{count}', String(inCat.length));
        return (
          <section key={category} className="rounded-xl border border-gray-200 dark:border-ios-dark-separator space-y-3">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-ios-dark-separator bg-gray-50/80 dark:bg-ios-dark-elevated/40">
              <h2 className="text-base font-semibold text-app-label">{heading}</h2>
              <p className="text-xs text-app-muted mt-0.5">{countLine}</p>
            </div>

            <div className="px-0 pb-3">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-ios-dark-separator">
                <h3 className="text-sm font-semibold text-app-label">
                  {m.unreviewed} ({unreviewed.length})
                </h3>
              </div>
              {unreviewed.length === 0 ? (
                <p className="px-4 py-4 text-sm text-app-secondary">{m.noUnreviewedInCategory}</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-ios-dark-separator">
                  {unreviewed.map((r) => (
                    <ReportListItem
                      key={r.id}
                      r={r}
                      busyId={busyId}
                      onMarkReviewed={markReviewed}
                      onExtend={openExtend}
                      m={m}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="px-0 pb-3">
              <div className="px-4 py-2 border-b border-gray-100 dark:border-ios-dark-separator">
                <h3 className="text-sm font-semibold text-app-label">
                  {m.reviewed} ({reviewed.length})
                </h3>
              </div>
              {reviewed.length === 0 ? (
                <p className="px-4 py-4 text-sm text-app-secondary">{m.noReviewedInCategory}</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-ios-dark-separator">
                  {reviewed.map((r) => (
                    <ReportListItem
                      key={r.id}
                      r={r}
                      busyId={busyId}
                      onMarkReviewed={markReviewed}
                      onExtend={openExtend}
                      m={m}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 ? (
        <p className="text-sm text-app-secondary px-1">{m.noMatchFilters}</p>
      ) : null}

      {extendId ? (
        <div
          ref={extendLayerRef}
          id="manager-reports-extend-layer"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manager-report-extend-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeExtend();
          }}
        >
          <div className="w-full sm:max-w-lg max-h-[min(90vh,640px)] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated-2 shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-ios-dark-separator shrink-0">
              <h2 id="manager-report-extend-title" className="text-sm font-semibold text-app-label">
                {m.fullReportTitle}
              </h2>
              <button
                type="button"
                onClick={closeExtend}
                className="rounded-lg px-2 py-1 text-xs font-medium text-app-secondary hover:bg-gray-100 dark:hover:bg-ios-dark-elevated"
              >
                {m.close}
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1 min-h-0">
              {extendLoading ? <p className="text-sm text-app-secondary">{m.loading}</p> : null}
              {extendError ? <p className="text-sm text-red-600 dark:text-red-400">{extendError}</p> : null}
              {!extendLoading && !extendError && extendPayload?.kind === 'form' ? (
                <FormSubmissionDetail s={extendPayload.submission} />
              ) : null}
              {!extendLoading && !extendError && extendPayload?.kind === 'time_clock' ? (
                <TimeClockDetailBody payload={extendPayload} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
