'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { openRearCameraCapture } from '@/lib/open-camera-file';

type PhotoItem = {
  id: string;
  uploadPath: string;
  status: string;
  aiVerdict: string;
  aiExplanation: string | null;
  submittedAt: string;
};

type SubmitResult = {
  item: PhotoItem;
  employeeOutcome: 'approved' | 'rejected' | 'pending_qc';
  kpiBoosted: boolean;
  live: boolean;
  error?: string;
};

export function PhotoCheckCapture() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [recent, setRecent] = useState<PhotoItem[]>([]);

  useEffect(() => {
    void fetch('/api/photo-checks', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: PhotoItem[] }) => setRecent(Array.isArray(d.items) ? d.items : []))
      .catch(() => undefined);
  }, []);

  async function onCapture(file: File | null) {
    if (!file) return;
    setError(null);
    setResult(null);
    setBusy(true);
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    try {
      const form = new FormData();
      form.set('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const upJson = (await up.json()) as { url?: string; error?: string };
      if (!up.ok || !upJson.url) throw new Error(upJson.error || t.photoCheck.uploadFailed);

      const res = await fetch('/api/photo-checks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadPath: upJson.url }),
      });
      const json = (await res.json()) as SubmitResult & { error?: string };
      if (!res.ok) throw new Error(json.error || t.photoCheck.reviewFailed);
      setResult(json);
      setRecent((prev) => [json.item, ...prev].slice(0, 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.photoCheck.reviewFailed);
    } finally {
      setBusy(false);
    }
  }

  const outcome = result?.employeeOutcome;
  const outcomeClass =
    outcome === 'approved'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
      : outcome === 'rejected'
        ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
        : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200';

  return (
    <div className="space-y-6">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          openRearCameraCapture((file) => {
            void onCapture(file);
          });
        }}
        className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ios-blue/40 bg-ios-blue/5 px-6 py-10 text-center active:scale-[0.99] disabled:opacity-60"
      >
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-ios-blue text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8" aria-hidden>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
        <span className="text-xl font-bold text-app-primary">
          {busy ? t.photoCheck.reviewing : t.photoCheck.takePhoto}
        </span>
        <span className="max-w-xs text-sm text-app-muted">{t.photoCheck.takePhotoHint}</span>
      </button>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mx-auto max-h-72 w-full rounded-2xl object-cover" />
      ) : null}

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <div className={`rounded-2xl border px-4 py-4 space-y-2 ${outcomeClass}`}>
          <p className="text-lg font-bold">
            {outcome === 'approved'
              ? t.photoCheck.approved
              : outcome === 'rejected'
                ? t.photoCheck.rejected
                : t.photoCheck.sentToQc}
          </p>
          {result.item.aiExplanation ? <p className="text-sm opacity-90">{result.item.aiExplanation}</p> : null}
          {result.kpiBoosted ? <p className="text-sm font-medium">{t.photoCheck.kpiBoosted}</p> : null}
          {outcome === 'rejected' ? <p className="text-sm">{t.photoCheck.tryAgain}</p> : null}
        </div>
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-app-secondary">{t.photoCheck.recent}</h2>
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-ios-dark-separator dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
            {recent.slice(0, 8).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-app-primary">
                  {row.status === 'approved' || row.aiVerdict === 'pass'
                    ? t.photoCheck.approved
                    : row.status === 'ai_rejected' || row.status === 'rejected'
                      ? t.photoCheck.rejected
                      : t.photoCheck.sentToQc}
                </span>
                <span className="text-xs text-app-muted">{new Date(row.submittedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
