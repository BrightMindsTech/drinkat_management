'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type TargetRow = {
  id: string;
  name: string;
  existing: { targetEmployeeId: string; score: number; reason: string | null; updatedAt: string } | null;
};

type WeeklyPayload = {
  weekStartKey: string;
  emphasisWeekend: boolean;
  expectedTargets: TargetRow[];
  complete: boolean;
  blockingClock: boolean;
};

const THANK_YOU_MS = 4000;

export function WeeklyRatingsClient() {
  const { t, dir } = useLanguage();
  const r = t.ratings;
  const [data, setData] = useState<WeeklyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouProgressPct, setThankYouProgressPct] = useState(100);
  const thankYouRaf = useRef<number | null>(null);

  const load = useCallback(async (opts?: { signal?: AbortSignal }): Promise<WeeklyPayload | null> => {
    const signal = opts?.signal;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ratings/weekly', { credentials: 'include', signal });
      if (signal?.aborted) return null;
      const j = (await res.json().catch(() => ({}))) as WeeklyPayload & { error?: string };
      if (signal?.aborted) return null;
      if (!res.ok) {
        setError((j as { error?: string }).error ?? r.loadFailed);
        setData(null);
        return null;
      }
      setData(j);
      const nextScores: Record<string, string> = {};
      const nextReasons: Record<string, string> = {};
      for (const row of j.expectedTargets) {
        nextScores[row.id] = row.existing ? String(row.existing.score) : '';
        nextReasons[row.id] = row.existing?.reason ?? '';
      }
      setScores(nextScores);
      setReasons(nextReasons);
      return j;
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) return null;
      setError(r.loadFailed);
      setData(null);
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [r.loadFailed]);

  useEffect(() => {
    const ac = new AbortController();
    void load({ signal: ac.signal });
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    if (!showThankYou) return;
    setThankYouProgressPct(100);
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.max(0, 100 - (elapsed / THANK_YOU_MS) * 100);
      setThankYouProgressPct(pct);
      if (elapsed >= THANK_YOU_MS) {
        setShowThankYou(false);
        return;
      }
      thankYouRaf.current = requestAnimationFrame(tick);
    };
    thankYouRaf.current = requestAnimationFrame(tick);
    return () => {
      if (thankYouRaf.current != null) cancelAnimationFrame(thankYouRaf.current);
      thankYouRaf.current = null;
    };
  }, [showThankYou]);

  useEffect(() => {
    if (!showThankYou) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showThankYou]);

  const statusLine = useMemo(() => {
    if (!data) return '';
    if (data.complete) return r.complete;
    if (data.blockingClock) return `${r.incomplete} ${r.blockingClock}`;
    return r.incomplete;
  }, [data, r]);

  async function submitOne(targetId: string) {
    const rawScore = Number(scores[targetId]);
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) return;
    const reason = (reasons[targetId] ?? '').trim();
    if (rawScore < 85 && reason.length < 5) return;

    setBusyId(targetId);
    setSavedId(null);
    try {
      const res = await fetch('/api/ratings/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetEmployeeId: targetId,
          score: Math.round(rawScore),
          reason: rawScore < 85 ? reason : undefined,
        }),
      });
      const rawText = await res.text();
      let parsed: { error?: string; ok?: boolean } = {};
      if (rawText) {
        try {
          parsed = JSON.parse(rawText) as { error?: string; ok?: boolean };
        } catch {
          parsed = {};
        }
      }
      if (!res.ok) {
        setError(
          typeof parsed.error === 'string' && parsed.error.length > 0
            ? parsed.error
            : `${r.saveFailed} (HTTP ${res.status})`
        );
        return;
      }
      setError(null);
      setSavedId(targetId);
      const fresh = await load();
      if (fresh?.complete) {
        setShowThankYou(true);
      } else if (fresh) {
        const nextId = fresh.expectedTargets.find((row) => !row.existing)?.id;
        if (nextId) {
          requestAnimationFrame(() => {
            const el = document.getElementById(`weekly-rating-card-${nextId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.querySelector<HTMLInputElement>('input[type="number"]')?.focus();
          });
        }
      }
    } catch {
      setError(r.saveFailed);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) return <p className="text-app-muted py-6">{t.common.loading}</p>;
  if (error && !data) return <p className="text-red-600 dark:text-red-400 py-6">{error}</p>;
  if (!data) return <p className="text-app-muted py-6">{t.common.noData}</p>;

  return (
    <div id="section-ratings-main" className="scroll-mt-28 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-app-label">{r.pageTitle}</h1>
        <p className="text-sm text-app-secondary mt-2">{r.intro}</p>
        <p className="text-xs text-app-muted mt-2">
          {r.weekDue}: <span className="font-mono tabular-nums">{data.weekStartKey}</span>
        </p>
        {data.emphasisWeekend ? <p className="text-xs text-ios-blue mt-1">{r.emphasisWeekend}</p> : null}
        <p className="text-xs text-app-muted mt-1">{r.catchUp}</p>
        <p className={`text-sm mt-3 font-medium ${data.complete ? 'text-green-700 dark:text-green-400' : 'text-amber-800 dark:text-amber-300'}`}>
          {statusLine}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {data.expectedTargets.length === 0 ? (
        <p className="text-sm text-app-secondary">{r.noTargets}</p>
      ) : (
        <ul className="space-y-6">
          {data.expectedTargets.map((row) => {
            const sc = scores[row.id] ?? '';
            const num = Number(sc);
            const needReason = Number.isFinite(num) && num < 85;
            return (
              <li
                key={row.id}
                id={`weekly-rating-card-${row.id}`}
                className="rounded-xl border border-gray-200 dark:border-ios-dark-separator p-4 space-y-3 scroll-mt-28"
              >
                <p className="text-sm font-semibold text-app-label">
                  {r.targetLabel}: {row.name}
                </p>
                <label className="block text-sm">
                  <span className="text-app-secondary">{r.scoreLabel}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="app-input mt-1"
                    value={sc}
                    onChange={(e) => setScores((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  />
                </label>
                {needReason ? (
                  <label className="block text-sm">
                    <span className="text-app-secondary">{r.reasonLabel}</span>
                    <textarea
                      className="app-input mt-1 min-h-[72px]"
                      value={reasons[row.id] ?? ''}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  disabled={
                    busyId === row.id ||
                    sc === '' ||
                    !Number.isFinite(Number(sc)) ||
                    Number(sc) < 0 ||
                    Number(sc) > 100 ||
                    (needReason && (reasons[row.id] ?? '').trim().length < 5)
                  }
                  onClick={() => submitOne(row.id)}
                  className="rounded-lg bg-ios-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busyId === row.id ? r.submitting : r.submit}
                </button>
                {savedId === row.id ? <span className="text-xs text-green-700 dark:text-green-400 ml-2">{r.saved}</span> : null}
              </li>
            );
          })}
        </ul>
      )}

      {showThankYou ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setShowThankYou(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weekly-ratings-thank-you-title"
            className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="weekly-ratings-thank-you-title" className="text-lg font-semibold text-app-label">
              {r.thankYouTitle}
            </h2>
            <p className="mt-2 text-sm text-app-secondary">{r.thankYouBody}</p>
            <div
              className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600"
              aria-hidden
            >
              <div
                className={`h-full rounded-full bg-ios-blue ${dir === 'rtl' ? 'ml-auto' : ''}`}
                style={{ width: `${thankYouProgressPct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowThankYou(false)}
              className="mt-4 w-full rounded-lg bg-ios-blue py-2.5 text-sm font-semibold text-white"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
