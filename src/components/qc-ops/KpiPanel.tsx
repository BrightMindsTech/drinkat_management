'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type KpiRange = 'day' | 'week' | 'month';

type Comp = { key: string; weight: number; raw: number | null; status: string; evidenceCount: number };
type Kpi = {
  total: number | null;
  displayTotal?: number | null;
  mode: string;
  range?: KpiRange;
  periodKey?: string;
  purpose?: string;
  employmentDecisionUse?: boolean;
  individualScorePublished?: boolean;
  assistantManagerAttribution?: string;
  components: Comp[];
  officialPublicationAllowed: boolean;
  note?: string;
  name?: string;
  employeeId?: string;
  role?: string;
  branchName?: string;
};

const RANGES: { id: KpiRange; en: string; ar: string }[] = [
  { id: 'day', en: 'Daily', ar: 'يومي' },
  { id: 'week', en: 'Weekly', ar: 'أسبوعي' },
  { id: 'month', en: 'Monthly', ar: 'شهري' },
];

export function KpiPanel({ roster }: { roster?: boolean }) {
  const { t, locale } = useLanguage();
  const [range, setRange] = useState<KpiRange>('day');
  const [data, setData] = useState<Kpi | { scores: Kpi[]; periodKey?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [canHr, setCanHr] = useState(false);
  const [comment, setComment] = useState('');
  const [hrMsg, setHrMsg] = useState<string | null>(null);

  const load = useCallback(async (next: KpiRange) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(roster ? `/api/kpi/branch?range=${next}` : `/api/kpi/me?range=${next}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as Kpi | { scores?: Kpi[]; error?: string };
      if (!res.ok) throw new Error((json as { error?: string }).error || 'KPI unavailable');
      setData(json as Kpi | { scores: Kpi[] });
    } catch {
      setErr('KPI unavailable');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [roster]);

  useEffect(() => {
    void load(range);
  }, [load, range]);

  useEffect(() => {
    fetch('/api/kpi/hr-reviews', { credentials: 'include' })
      .then((r) => setCanHr(r.ok))
      .catch(() => setCanHr(false));
  }, []);

  const scores = useMemo(() => {
    if (data && 'scores' in data) return data.scores;
    if (data && 'components' in data) return [data];
    return [];
  }, [data]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return scores;
    return scores.filter((s) => {
      const blob = `${s.name ?? ''} ${s.branchName ?? ''} ${s.role ?? ''}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [scores, q]);

  const periodKey = data && 'periodKey' in data ? data.periodKey : scores[0]?.periodKey;

  async function hrAction(employeeId: string, action: 'comment' | 'flag' | 'complete') {
    const res = await fetch('/api/kpi/hr-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, action, comments: comment, periodKey }),
    });
    const json = (await res.json()) as { error?: string; status?: string; canOverwriteTotals?: boolean };
    setHrMsg(json.error ?? `HR ${json.status}; overwrite=${String(json.canOverwriteTotals)}`);
  }

  return (
    <div id="section-kpi" className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-primary">{t.qcOps.kpiTitle}</h1>
        <p className="mt-1 text-sm leading-relaxed text-app-muted">{t.qcOps.kpiShadowNote}</p>
      </div>

      <div className="grid grid-cols-3 rounded-2xl bg-gray-100 p-1 dark:bg-ios-dark-fill">
        {RANGES.map((r) => {
          const on = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`min-h-11 rounded-xl text-sm font-semibold transition-colors touch-manipulation ${
                on ? 'bg-white text-app-primary shadow-sm dark:bg-ios-dark-elevated' : 'text-app-muted'
              }`}
            >
              {locale === 'ar' ? r.ar : r.en}
            </button>
          );
        })}
      </div>

      {roster ? (
        <input
          className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={locale === 'ar' ? 'بحث بالاسم' : 'Search name'}
        />
      ) : null}

      <p className="text-xs font-medium text-app-muted">
        {loading ? (locale === 'ar' ? 'جارٍ الحساب…' : 'Scoring…') : `${periodKey ?? ''} · ${visible.length}`}
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {hrMsg ? <p className="text-sm text-app-muted">{hrMsg}</p> : null}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-3xl border border-gray-200 bg-white dark:divide-ios-dark-separator dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        {visible.map((s) => {
          const id = s.employeeId ?? s.name ?? 'me';
          const open = openId === id;
          const shown = s.individualScorePublished === false ? s.displayTotal ?? null : s.total;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start touch-manipulation"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-app-primary">{s.name ?? '—'}</p>
                  <p className="truncate text-xs text-app-muted">
                    {[s.branchName, s.role?.replaceAll('_', ' ')].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-bold tabular-nums text-app-primary">
                  {shown == null ? '—' : shown.toFixed(0)}
                </p>
              </button>
              {open ? (
                <div className="space-y-3 px-4 pb-4">
                  <ScoreCard kpi={s} t={t} />
                  {canHr && s.employeeId ? (
                    <div className="space-y-2">
                      <textarea
                        className="min-h-11 w-full rounded-xl border p-2 text-sm"
                        placeholder={t.qcOps.kpiHrComment}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void hrAction(s.employeeId!, 'comment')}>
                          {t.qcOps.kpiHrReview}
                        </button>
                        <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void hrAction(s.employeeId!, 'flag')}>
                          {t.qcOps.kpiHrFlag}
                        </button>
                        <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void hrAction(s.employeeId!, 'complete')}>
                          {t.qcOps.kpiHrComplete}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-app-muted">{locale === 'ar' ? 'لا توجد نتائج.' : 'No matching people.'}</p>
      ) : null}
    </div>
  );
}

function ScoreCard({
  kpi,
  t,
}: {
  kpi: Kpi;
  t: { qcOps: { scored: string; provisional: string; notRated: string; kpiAmUnpublished: string } };
}) {
  const shown = kpi.individualScorePublished === false ? kpi.displayTotal ?? null : kpi.total;
  return (
    <div className="space-y-2">
      {kpi.individualScorePublished === false ? <p className="text-xs text-app-muted">{t.qcOps.kpiAmUnpublished}</p> : null}
      <p className="text-2xl tabular-nums">{shown == null ? '—' : shown.toFixed(1)}</p>
      <ul className="text-sm space-y-1">
        {kpi.components.map((c) => (
          <li key={c.key} className="flex justify-between gap-2">
            <span>
              {c.key} ({c.weight}%)
            </span>
            <span>
              {c.raw == null ? '—' : c.raw.toFixed(0)} ·{' '}
              {c.status === 'scored' ? t.qcOps.scored : c.status === 'provisional' ? t.qcOps.provisional : t.qcOps.notRated}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
