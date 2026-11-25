'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { openNativeImageSourcePick } from '@/lib/open-camera-file';
import {
  BRANCH_INSPECTION_KIND,
  BRANCH_INSPECTION_SECTIONS,
  INSPECTION_PHOTO_NOTE_MAX,
  INSPECTION_PHOTOS_PER_ITEM_MAX,
  type InspectionResult,
} from '@/lib/qc-branch-inspection';
import {
  WAREHOUSE_INSPECTION_KIND,
  WAREHOUSE_INSPECTION_SECTIONS,
  warehouseInspectionBranches,
} from '@/lib/qc-warehouse-inspection';
import type { QcTemplateSection } from '@/lib/qc-form-templates';
import { QcNotifyPicker, defaultNotifyTargets, type QcNotifyOption } from '@/components/qc/QcNotifyPicker';
import { OpenUploadPhoto } from '@/components/UploadPhotoViewer';

type Branch = { id: string; name: string };
type Draft = { result: InspectionResult | null; photoUrls: string[]; photoNotes: Record<string, string> };

function emptyDraft(): Draft {
  return { result: null, photoUrls: [], photoNotes: {} };
}

function emptyDrafts(itemIds: readonly string[]): Record<string, Draft> {
  const out: Record<string, Draft> = {};
  for (const id of itemIds) out[id] = emptyDraft();
  return out;
}

type InspectionFormProps = {
  branches: Branch[];
  notifyOptions: QcNotifyOption[];
  initialBranchId: string;
  onCancel: () => void;
  onSubmitted: () => Promise<void> | void;
  variant?: 'branch' | 'warehouse';
  sectionsOverride?: QcTemplateSection[];
};

export function QcBranchInspectionForm({
  branches,
  notifyOptions,
  initialBranchId,
  onCancel,
  onSubmitted,
  variant = 'branch',
  sectionsOverride,
}: InspectionFormProps) {
  const { t, locale } = useLanguage();
  const warehouseOnly = variant === 'warehouse';
  const sections =
    sectionsOverride?.length
      ? sectionsOverride
      : warehouseOnly
        ? WAREHOUSE_INSPECTION_SECTIONS
        : BRANCH_INSPECTION_SECTIONS;
  const itemIds = sections.flatMap((s) => s.items.map((i) => i.id));
  const itemIdsKey = itemIds.join(',');
  const kind = warehouseOnly ? WAREHOUSE_INSPECTION_KIND : BRANCH_INSPECTION_KIND;
  const branchChoices = warehouseOnly ? warehouseInspectionBranches(branches) : branches;
  const [branchId, setBranchId] = useState(
    () =>
      (branchChoices.some((b) => b.id === initialBranchId) ? initialBranchId : '') ||
      branchChoices[0]?.id ||
      ''
  );
  const [notifyTo, setNotifyTo] = useState<string[]>(() => defaultNotifyTargets(notifyOptions));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => emptyDrafts(itemIds));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nowLabel = useMemo(() => formatAppDateTime(new Date().toISOString(), locale), [locale]);

  useEffect(() => {
    const next = defaultNotifyTargets(notifyOptions);
    setNotifyTo((cur) => (cur.length === 1 && cur[0] === 'all' ? next : cur));
  }, [notifyOptions]);

  useEffect(() => {
    const ids = itemIdsKey.split(',').filter(Boolean);
    setDrafts((cur) => {
      const next = emptyDrafts(ids.length ? ids : itemIds);
      for (const id of Object.keys(next)) {
        if (cur[id]) next[id] = cur[id]!;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemIds listed via itemIdsKey
  }, [itemIdsKey]);

  const answered = itemIds.every((id) => drafts[id]?.result);
  const uploading = busy !== null && busy !== 'submit';

  function setResult(id: string, result: InspectionResult) {
    setDrafts((cur) => ({ ...cur, [id]: { ...(cur[id] ?? emptyDraft()), result } }));
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
          const row = cur[id] ?? emptyDraft();
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
      const answers: Record<
        string,
        { result: InspectionResult; photoUrl: string | null; photoUrls: string[]; photoNotes: Record<string, string> }
      > = {};
      for (const id of itemIds) {
        const row = drafts[id];
        if (!row?.result) {
          setErr(t.qcOps.qcInspectNeedAll);
          return;
        }
        const photoNotes: Record<string, string> = {};
        for (const url of row.photoUrls) {
          const note = (row.photoNotes[url] ?? '').trim();
          if (note) photoNotes[url] = note.slice(0, INSPECTION_PHOTO_NOTE_MAX);
        }
        answers[id] = {
          result: row.result,
          photoUrl: row.photoUrls[0] ?? null,
          photoUrls: row.photoUrls,
          photoNotes,
        };
      }
      const res = await fetch('/api/qc-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
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
          <h2 className="text-xl font-bold tracking-tight text-app-primary">
            {warehouseOnly ? t.qcOps.qcWarehouseInspectNew : t.qcOps.qcInspectNew}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-app-muted">
            {warehouseOnly ? t.qcOps.qcWarehouseInspectHint : t.qcOps.qcInspectHint}
          </p>
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

      {warehouseOnly && branchChoices.length === 0 ? (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">
          {t.qcOps.qcWarehouseInspectNoBranch}
        </p>
      ) : warehouseOnly && branchChoices.length === 1 ? (
        <p className="text-sm font-medium text-app-primary">
          <span className="text-app-muted">{t.qcOps.qcReportsBranch}: </span>
          {branchChoices[0].name}
        </p>
      ) : (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsBranch}</span>
          <select
            aria-label={t.qcOps.qcReportsBranch}
            className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branchChoices.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs text-app-muted">
        {t.qcOps.qcInspectWhen}: {nowLabel}
      </p>
      <QcNotifyPicker
        options={notifyOptions}
        selected={notifyTo}
        onChange={setNotifyTo}
        disabled={busy !== null}
      />

      {sections.map((section) => (
        <section key={section.id} className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
          <header className="bg-teal-700 px-4 py-2.5 text-white dark:bg-teal-800">
            <p className="text-sm font-bold">
              {section.id} · {locale === 'ar' ? section.titleAr : section.titleEn}
            </p>
          </header>
          <ul className="divide-y divide-gray-100 dark:divide-ios-dark-separator">
            {section.items.map((item) => {
              const draft = drafts[item.id] ?? emptyDraft();
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
                        openNativeImageSourcePick((files) => {
                          void uploadPhotos(item.id, files);
                        });
                      }}
                    >
                      {busy === item.id ? t.qcOps.qcReportsUploading : t.qcOps.qcInspectPhoto}
                    </button>
                  </div>
                  {draft.photoUrls.length ? (
                    <div className="space-y-2">
                      {draft.photoUrls.map((url) => (
                        <div key={url} className="flex items-start gap-2">
                          <div className="relative shrink-0">
                            <OpenUploadPhoto src={url} gallery={draft.photoUrls} className="h-16 w-16 rounded-xl object-cover" />
                            <button
                              type="button"
                              className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                              onClick={() =>
                                setDrafts((cur) => {
                                  const row = cur[item.id] ?? emptyDraft();
                                  const photoNotes = { ...row.photoNotes };
                                  delete photoNotes[url];
                                  return {
                                    ...cur,
                                    [item.id]: {
                                      ...row,
                                      photoUrls: row.photoUrls.filter((u) => u !== url),
                                      photoNotes,
                                    },
                                  };
                                })
                              }
                              aria-label={t.common.close}
                            >
                              ×
                            </button>
                          </div>
                          <label className="min-w-0 flex-1 space-y-0.5">
                            <span className="text-[11px] font-medium text-app-muted">{t.qcOps.qcInspectPhotoReason}</span>
                            <input
                              type="text"
                              value={draft.photoNotes[url] ?? ''}
                              maxLength={INSPECTION_PHOTO_NOTE_MAX}
                              placeholder={t.qcOps.qcInspectPhotoReasonPh}
                              className="min-h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                              onChange={(e) =>
                                setDrafts((cur) => {
                                  const row = cur[item.id] ?? emptyDraft();
                                  return {
                                    ...cur,
                                    [item.id]: {
                                      ...row,
                                      photoNotes: { ...row.photoNotes, [url]: e.target.value },
                                    },
                                  };
                                })
                              }
                            />
                          </label>
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
          placeholder={warehouseOnly ? t.qcOps.qcWarehouseInspectNotesPh : t.qcOps.qcInspectNotesPh}
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

export function QcWarehouseInspectionForm(props: Omit<InspectionFormProps, 'variant'>) {
  return <QcBranchInspectionForm {...props} variant="warehouse" />;
}
