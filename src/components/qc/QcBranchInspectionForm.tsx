'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { openRearCameraCapture } from '@/lib/open-camera-file';
import {
  BRANCH_INSPECTION_ITEM_IDS,
  BRANCH_INSPECTION_KIND,
  BRANCH_INSPECTION_SECTIONS,
  type InspectionResult,
} from '@/lib/qc-branch-inspection';
import { QcNotifyPicker, defaultNotifyTargets, type QcNotifyOption } from '@/components/qc/QcNotifyPicker';

type Branch = { id: string; name: string };
type Draft = { result: InspectionResult | null; photoUrl: string | null };

function emptyDrafts(): Record<string, Draft> {
  const out: Record<string, Draft> = {};
  for (const id of BRANCH_INSPECTION_ITEM_IDS) out[id] = { result: null, photoUrl: null };
  return out;
}

export function QcBranchInspectionForm({
  branches,
  notifyOptions,
  initialBranchId,
  onCancel,
  onSubmitted,
}: {
  branches: Branch[];
  notifyOptions: QcNotifyOption[];
  initialBranchId: string;
  onCancel: () => void;
  onSubmitted: () => Promise<void> | void;
}) {
  const { t, locale } = useLanguage();
  const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || '');
  const [notifyTo, setNotifyTo] = useState<string[]>(() => defaultNotifyTargets(notifyOptions));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(emptyDrafts);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nowLabel = useMemo(() => formatAppDateTime(new Date().toISOString(), locale), [locale]);

  useEffect(() => {
    const next = defaultNotifyTargets(notifyOptions);
    setNotifyTo((cur) => (cur.length === 1 && cur[0] === 'all' ? next : cur));
  }, [notifyOptions]);

  const answered = BRANCH_INSPECTION_ITEM_IDS.every((id) => drafts[id]?.result);
  const uploading = busy !== null && busy !== 'submit';

  function setResult(id: string, result: InspectionResult) {
    setDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] ?? { photoUrl: null }), result } }));
  }

  async function uploadPhoto(id: string, file: File) {
    setBusy(id);
    setErr(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const r = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const d = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !d.url) {
        setErr(d.error || t.qcOps.qcReportsFailed);
        return;
      }
      setDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] ?? { result: null }), photoUrl: d.url! } }));
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!branchId || !answered || busy) return;
    if (!notifyTo.length) {
      setErr(t.qcOps.qcReportsNotifyNeedOne);
      return;
    }
    setBusy('submit');
    setErr(null);
    try {
      const answers: Record<string, { result: InspectionResult; photoUrl: string | null }> = {};
      for (const id of BRANCH_INSPECTION_ITEM_IDS) {
        const row = drafts[id];
        if (!row?.result) {
          setErr(t.qcOps.qcInspectNeedAll);
          return;
        }
        answers[id] = { result: row.result, photoUrl: row.photoUrl };
      }
      const res = await fetch('/api/qc-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: BRANCH_INSPECTION_KIND,
          branchId,
          notes: notes.trim(),
          answers,
          notifyTo,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(json.error ?? t.qcOps.qcReportsFailed);
        return;
      }
      await onSubmitted();
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-app-primary">{t.qcOps.qcInspectNew}</h2>
          <p className="mt-1 text-sm leading-relaxed text-app-muted">{t.qcOps.qcInspectHint}</p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={onCancel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-app-muted disabled:opacity-50"
          aria-label={t.qcOps.qcReportsCancel}
        >
          ×
        </button>
      </div>

      {err ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{err}</p> : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsBranch}</span>
        <select
          aria-label={t.qcOps.qcReportsBranch}
          className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-app-muted">
        {t.qcOps.qcInspectWhen}: {nowLabel}
      </p>
      <QcNotifyPicker
        options={notifyOptions}
        selected={notifyTo}
        onChange={setNotifyTo}
        disabled={busy !== null}
      />

      {BRANCH_INSPECTION_SECTIONS.map((section) => (
        <section key={section.id} className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
          <header className="bg-teal-700 px-4 py-2.5 text-white dark:bg-teal-800">
            <p className="text-sm font-bold">
              {section.id} · {locale === 'ar' ? section.titleAr : section.titleEn}
            </p>
          </header>
          <ul className="divide-y divide-gray-100 dark:divide-ios-dark-separator">
            {section.items.map((item) => {
              const draft = drafts[item.id] ?? { result: null, photoUrl: null };
              const title = locale === 'ar' ? item.titleAr : item.titleEn;
              return (
                <li key={item.id} className="space-y-2 px-3 py-3">
                  <p className="text-sm font-medium text-app-primary">
                    {item.n}. {title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setResult(item.id, 'pass')}
                      className={`min-h-11 min-w-[4.5rem] rounded-xl px-3 text-sm font-bold touch-manipulation ${
                        draft.result === 'pass'
                          ? 'bg-emerald-600 text-white'
                          : 'border border-gray-200 text-app-muted dark:border-ios-dark-separator'
                      }`}
                    >
                      ✓ {t.qcOps.qcInspectPass}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => setResult(item.id, 'fail')}
                      className={`min-h-11 min-w-[4.5rem] rounded-xl px-3 text-sm font-bold touch-manipulation ${
                        draft.result === 'fail'
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-200 text-app-muted dark:border-ios-dark-separator'
                      }`}
                    >
                      × {t.qcOps.qcInspectFail}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-ios-dark-separator"
                      onClick={() => {
                        if (busy) return;
                        openRearCameraCapture((file) => {
                          void uploadPhoto(item.id, file);
                        });
                      }}
                    >
                      {busy === item.id ? t.qcOps.qcReportsUploading : t.qcOps.qcInspectPhoto}
                    </button>
                  </div>
                  {draft.photoUrl ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.photoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <button
                        type="button"
                        className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                        onClick={() =>
                          setDrafts((cur) => ({
                            ...cur,
                            [item.id]: { ...(cur[item.id] ?? { result: null }), photoUrl: null },
                          }))
                        }
                        aria-label={t.common.close}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <label className="block space-y-1">
        <span className="text-sm font-medium text-app-muted">{t.qcOps.qcInspectNotes}</span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.qcOps.qcInspectNotesPh}
          maxLength={4000}
        />
      </label>

      <button
        type="button"
        disabled={busy !== null || uploading || !answered || !branchId || notifyTo.length === 0}
        className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-bold text-white disabled:opacity-50"
        onClick={() => void submit()}
      >
        {busy === 'submit' ? t.qcOps.qcReportsSubmitting : t.qcOps.qcReportsSubmit}
      </button>
    </div>
  );
}
