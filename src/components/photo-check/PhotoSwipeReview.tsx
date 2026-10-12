'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseCriteriaJson } from '@/lib/photo-score';

function CriteriaList({ raw, defsJson, locale }: { raw: string; defsJson?: string | null; locale: string }) {
  try {
    const rows = JSON.parse(raw) as { key: string; met: boolean | null }[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const defs = parseCriteriaJson(defsJson);
    const label = (key: string) => {
      const hit = defs.find((d) => d.key === key);
      if (!hit) return key;
      return locale === 'ar' ? hit.labelAr || hit.labelEn : hit.labelEn;
    };
    return (
      <ul className="text-xs text-app-muted">
        {rows.map((c) => (
          <li key={c.key}>
            {label(c.key)}: {c.met == null ? 'unassessable' : c.met ? 'pass' : 'fail'}
          </li>
        ))}
      </ul>
    );
  } catch {
    return null;
  }
}

type QueueItem = {
  id: string;
  uploadPath: string;
  uploadPaths?: string[];
  aiVerdict: string;
  aiScore: number | null;
  aiExplanation: string | null;
  aiCriteriaJson: string | null;
  measuredValue: string | null;
  submittedAt: string;
  employee: { id: string; name: string };
  branch: { id: string; name: string };
  type: { titleEn: string; titleAr: string; criteriaJson?: string | null } | null;
};

export function PhotoSwipeReview() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dx, setDx] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const decidingRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/photo-checks/queue', { credentials: 'include', cache: 'no-store' });
      const json = (await res.json()) as { items?: QueueItem[]; error?: string };
      if (!res.ok) throw new Error(json.error || t.photoReview.loadFailed);
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.photoReview.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.photoReview.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = items[0] ?? null;
  const paths = current ? (current.uploadPaths?.length ? current.uploadPaths : [current.uploadPath]) : [];
  const shown = paths[Math.min(photoIndex, Math.max(0, paths.length - 1))] ?? current?.uploadPath;

  useEffect(() => {
    setPhotoIndex(0);
  }, [current?.id]);

  async function decide(decision: 'approved' | 'rejected') {
    if (!current || busy || decidingRef.current) return;
    decidingRef.current = true;
    setBusy(true);
    setDx(decision === 'approved' ? 420 : -420);
    try {
      const res = await fetch(`/api/photo-checks/${current.id}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.status === 409) {
        setItems((prev) => prev.filter((x) => x.id !== current.id));
        return;
      }
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error || t.photoReview.reviewFailed);
      }
      setItems((prev) => prev.filter((x) => x.id !== current.id));
      setPhotoIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.photoReview.reviewFailed);
    } finally {
      decidingRef.current = false;
      setBusy(false);
      setDx(0);
      startX.current = null;
    }
  }

  function onPointerDown(clientX: number) {
    if (busy) return;
    startX.current = clientX;
  }
  function onPointerMove(clientX: number) {
    if (startX.current == null || busy) return;
    setDx(clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current == null || busy) return;
    if (dx > 90) void decide('approved');
    else if (dx < -90) void decide('rejected');
    else setDx(0);
    startX.current = null;
  }

  if (loading) {
    return <p className="text-sm text-app-muted">{t.photoReview.loading}</p>;
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        <p className="text-xl font-bold text-app-primary">{t.photoReview.emptyTitle}</p>
        <p className="mt-2 text-sm text-app-muted">{t.photoReview.emptyHint}</p>
      </div>
    );
  }

  const rotate = Math.max(-12, Math.min(12, dx / 18));
  const approveHint = dx > 40;
  const rejectHint = dx < -40;

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <p className="text-sm text-app-muted">{t.photoReview.remaining.replace('{count}', String(items.length))}</p>

      <div className="relative mx-auto min-h-[420px] max-w-md">
        {items.slice(1, 3).map((card, i) => (
          <div
            key={card.id}
            className="absolute inset-x-4 top-3 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
            style={{ transform: `scale(${0.96 - i * 0.03}) translateY(${(i + 1) * 10}px)`, zIndex: 1 }}
          >
            <div className="h-72 bg-gray-100 dark:bg-ios-dark-fill" />
          </div>
        ))}

        <div
          className="relative z-10 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg dark:border-ios-dark-separator dark:bg-ios-dark-elevated touch-none"
          style={{ transform: `translateX(${dx}px) rotate(${rotate}deg)`, transition: startX.current == null ? 'transform 180ms ease' : 'none' }}
          onPointerDown={(e) => {
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            onPointerDown(e.clientX);
          }}
          onPointerMove={(e) => onPointerMove(e.clientX)}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            startX.current = null;
            setDx(0);
          }}
        >
          {approveHint ? (
            <span className="absolute left-4 top-4 z-10 rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white">
              {t.photoReview.approve}
            </span>
          ) : null}
          {rejectHint ? (
            <span className="absolute right-4 top-4 z-10 rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white">
              {t.photoReview.reject}
            </span>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="h-80 w-full object-cover" />
          {paths.length > 1 ? (
            <div
              className="flex items-center justify-center gap-2 px-3 py-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="min-h-9 rounded-full border px-3 text-xs font-bold"
                onClick={() => setPhotoIndex((i) => (i - 1 + paths.length) % paths.length)}
              >
                ‹
              </button>
              <p className="text-xs text-app-muted">
                {t.photoReview.photoIndex.replace('{n}', String(photoIndex + 1)).replace('{total}', String(paths.length))}
              </p>
              <button
                type="button"
                className="min-h-9 rounded-full border px-3 text-xs font-bold"
                onClick={() => setPhotoIndex((i) => (i + 1) % paths.length)}
              >
                ›
              </button>
            </div>
          ) : null}
          {paths.length > 1 ? (
            <div className="flex justify-center gap-1.5 pb-2" onPointerDown={(e) => e.stopPropagation()}>
              {paths.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`photo ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full ${i === photoIndex ? 'bg-ios-blue' : 'bg-gray-300'}`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
            </div>
          ) : null}
          <div className="space-y-1 px-4 py-3">
            <p className="text-lg font-bold text-app-primary">{current.employee.name}</p>
            <p className="text-sm text-app-secondary">{current.branch.name}</p>
            {current.type ? (
              <p className="text-sm font-medium">{locale === 'ar' ? current.type.titleAr : current.type.titleEn}</p>
            ) : null}
            <p className="text-sm">
              {t.photoReview.aiAdvice}: {current.aiVerdict}
              {current.aiScore != null ? ` · ${current.aiScore.toFixed(0)}` : ''}
            </p>
            {current.measuredValue ? <p className="text-sm">Measured: {current.measuredValue}</p> : null}
            {current.aiExplanation ? <p className="text-sm text-app-muted">{current.aiExplanation}</p> : null}
            {current.aiCriteriaJson ? (
              <CriteriaList raw={current.aiCriteriaJson} defsJson={current.type?.criteriaJson} locale={locale} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-md gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide('rejected')}
          className="min-h-14 flex-1 rounded-full bg-red-500 text-base font-bold text-white disabled:opacity-50"
        >
          {t.photoReview.reject}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide('approved')}
          className="min-h-14 flex-1 rounded-full bg-emerald-500 text-base font-bold text-white disabled:opacity-50"
        >
          {t.photoReview.approve}
        </button>
      </div>
      <p className="text-center text-xs text-app-muted">{t.photoReview.swipeHint}</p>
    </div>
  );
}
