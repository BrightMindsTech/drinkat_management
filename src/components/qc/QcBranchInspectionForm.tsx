'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { openImageLibraryPick, openRearCameraCapture } from '@/lib/open-camera-file';
import {
  BRANCH_INSPECTION_ITEM_IDS,
  BRANCH_INSPECTION_KIND,
  BRANCH_INSPECTION_SECTIONS,
  INSPECTION_PHOTOS_PER_ITEM_MAX,
  type InspectionResult,
} from '@/lib/qc-branch-inspection';
import { QcNotifyPicker, defaultNotifyTargets, type QcNotifyOption } from '@/components/qc/QcNotifyPicker';

type Branch = { id: string; name: string };
type Draft = { result: InspectionResult | null; photoUrls: string[] };

function emptyDrafts(): Record<string, Draft> {
  const out: Record<string, Draft> = {};
  for (const id of BRANCH_INSPECTION_ITEM_IDS) out[id] = { result: null, photoUrls: [] };
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
    setDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] ?? { photoUrls: [] }), result } }));
  }

  function roomForPhotos(id: string, extra = 1) {
    const n = drafts[id]?.photoUrls.length ?? 0;
    return n + extra <= INSPECTION_PHOTOS_PER_ITEM_MAX;
  }

  async function uploadPhotos(id: string, files: File[]) {
    const room = INSPECTION_PHOTOS_PER_ITEM_MAX - (drafts[id]?.photoUrls.length ?? 0);
    const batch = files.slice(0, Math.max(0, room));
    if (!batch.length) return;
    setBusy(id);
    setErr(null);
    try {
      const uploaded: string[] = [];
      for (const file of batch) {
        const form = new FormData();
        form.set('file', file);
        const r = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
        const d = (await r.json()) as { url?: string; error?: string };
        if (!r.ok || !d.url) {
          setErr(d.error || t.qcOps.qcReportsFailed);
          break;
        }
        uploaded.push(d.url);
      }
      if (uploaded.length) {
        setDrafts((cur) => {
          const row = cur[id] ?? { result: null, photoUrls: [] };
          const next = [...row.photoUrls];
          for (const url of uploaded) {
            if (!next.includes(url) && next.length < INSPECTION_PHOTOS_PER_ITEM_MAX) next.push(url);
          }
          return { ...cur, [id]: { ...row, photoUrls: next } };
        });
      }
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
      const answers: Record<string, { result: InspectionResult; photoUrl: string | null; photoUrls: string[] }> = {};
      for (const id of BRANCH_INSPECTION_ITEM_IDS) {
        const row = drafts[id];
        if (!row?.result) {
          setErr(t.qcOps.qcInspectNeedAll);
          return;
        }
        answers[id] = { result: row.result, photoUrl: row.photoUrls[0] ?? null, photoUrls: row.photoUrls };
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
              const draft = drafts[item.id] ?? { result: null, photoUrls: [] };
              const title = locale === 'ar' ? item.titleAr : item.titleEn;
              const canAddPhoto = busy === null && roomForPhotos(item.id);
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
                      disabled={!canAddPhoto}
                      className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-ios-dark-separator"
                      onClick={() => {
                        if (!canAddPhoto) return;
                        openRearCameraCapture((file) => {
                          void uploadPhotos(item.id, [file]);
                        });
                      }}
                    >
                      {busy === item.id ? t.qcOps.qcReportsUploading : t.qcOps.qcInspectPhotoCamera}
                    </button>
                    <button
                      type="button"
                      disabled={!canAddPhoto}
                      className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-ios-dark-separator"
                      onClick={() => {
                        if (!canAddPhoto) return;
                        openImageLibraryPick((files) => {
                          void uploadPhotos(item.id, files);
                        });
                      }}
                    >
                      {busy === item.id ? t.qcOps.qcReportsUploading : t.qcOps.qcInspectPhotoLibrary}
                    </button>
                  </div>
                  {draft.photoUrls.length ? (
                    <div className="flex flex-wrap gap-2">
                      {draft.photoUrls.map((url) => (
                        <div key={url} className="relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                          <button
                            type="button"
                            className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                            onClick={() =>
                              setDrafts((cur) => {
                                const row = cur[item.id] ?? { result: null, photoUrls: [] };
                                return {
                                  ...cur,
                                  [item.id]: { ...row, photoUrls: row.photoUrls.filter((u) => u !== url) },
                                };
                              })
                            }
                            aria-label={t.common.close}
                          >
                            ×
                          </button>
                        </div>
                      ))}
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
