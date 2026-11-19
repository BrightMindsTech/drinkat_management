'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { openNativeImageSourcePick } from '@/lib/open-camera-file';
import {
  COMPLAINT_PHOTOS_MAX,
  COMPLAINT_PHOTO_NOTE_MAX,
  COMPLAINT_TYPES,
  CUSTOMER_COMPLAINT_KIND,
  type ComplaintTypeId,
} from '@/lib/qc-complaints';
import { QcNotifyPicker, defaultNotifyTargets, type QcNotifyOption } from '@/components/qc/QcNotifyPicker';

type Branch = { id: string; name: string };

export function QcComplaintForm({
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
  const [complainantName, setComplainantName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [types, setTypes] = useState<ComplaintTypeId[]>([]);
  const [description, setDescription] = useState('');
  const [staffInvolved, setStaffInvolved] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nowLabel = useMemo(() => formatAppDateTime(new Date().toISOString(), locale), [locale]);

  useEffect(() => {
    const next = defaultNotifyTargets(notifyOptions);
    setNotifyTo((cur) => (cur.length === 1 && cur[0] === 'all' ? next : cur));
  }, [notifyOptions]);

  const uploading = busy !== null && busy !== 'submit';
  const canAddPhoto = busy === null && photoUrls.length < COMPLAINT_PHOTOS_MAX;

  function toggleType(id: ComplaintTypeId) {
    setTypes((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function uploadPhotos(files: File[]) {
    const room = COMPLAINT_PHOTOS_MAX - photoUrls.length;
    const batch = files.slice(0, Math.max(0, room));
    if (!batch.length) return;
    setBusy('upload');
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
        setPhotoUrls((cur) => {
          const next = [...cur];
          for (const url of uploaded) {
            if (!next.includes(url) && next.length < COMPLAINT_PHOTOS_MAX) next.push(url);
          }
          return next;
        });
      }
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!branchId || !description.trim() || busy) return;
    if (!notifyTo.length) {
      setErr(t.qcOps.qcReportsNotifyNeedOne);
      return;
    }
    setBusy('submit');
    setErr(null);
    try {
      const res = await fetch('/api/qc-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: CUSTOMER_COMPLAINT_KIND,
          branchId,
          notifyTo,
          complainantName,
          phone,
          orderNumber,
          types,
          description,
          staffInvolved,
          actionTaken,
          photoUrls,
          photoNotes,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(json.error || t.qcOps.qcReportsFailed);
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
    <div className="space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-primary">{t.qcOps.qcComplaintNew}</h1>
          <p className="mt-1 text-sm leading-relaxed text-app-muted">{t.qcOps.qcComplaintHint}</p>
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

      <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
        <header className="bg-red-700 px-4 py-2.5 text-white dark:bg-red-800">
          <p className="text-sm font-bold">A · {t.qcOps.qcComplaintSectionA}</p>
        </header>
        <div className="space-y-3 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintName}</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={complainantName}
              onChange={(e) => setComplainantName(e.target.value)}
              maxLength={120}
              placeholder={t.qcOps.qcComplaintNamePh}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintPhone}</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              inputMode="tel"
              placeholder={t.qcOps.qcComplaintPhonePh}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintOrder}</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              maxLength={80}
              placeholder={t.qcOps.qcComplaintOrderPh}
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
        <header className="bg-red-700 px-4 py-2.5 text-white dark:bg-red-800">
          <p className="text-sm font-bold">B · {t.qcOps.qcComplaintSectionB}</p>
        </header>
        <div className="flex flex-wrap gap-2 px-3 py-3">
          {COMPLAINT_TYPES.map((row) => {
            const on = types.includes(row.id);
            return (
              <button
                key={row.id}
                type="button"
                disabled={busy !== null}
                onClick={() => toggleType(row.id)}
                className={`min-h-11 rounded-xl px-3 text-sm font-semibold touch-manipulation ${
                  on
                    ? 'bg-red-600 text-white'
                    : 'border border-gray-200 text-app-muted dark:border-ios-dark-separator'
                }`}
              >
                {locale === 'ar' ? row.titleAr : row.titleEn}
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
        <header className="bg-red-700 px-4 py-2.5 text-white dark:bg-red-800">
          <p className="text-sm font-bold">C · {t.qcOps.qcComplaintSectionC}</p>
        </header>
        <div className="space-y-3 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintDetails}</span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.qcOps.qcComplaintDetailsPh}
              maxLength={4000}
            />
          </label>
          <button
            type="button"
            disabled={!canAddPhoto}
            className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-semibold disabled:opacity-50 dark:border-ios-dark-separator"
            onClick={() => {
              if (!canAddPhoto) return;
              openNativeImageSourcePick((files) => {
                void uploadPhotos(files);
              });
            }}
          >
            {busy === 'upload' ? t.qcOps.qcReportsUploading : t.qcOps.qcInspectPhoto}
          </button>
          {photoUrls.length ? (
            <div className="space-y-2">
              {photoUrls.map((url) => (
                <div key={url} className="flex items-start gap-2">
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    <button
                      type="button"
                      className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                      onClick={() => {
                        setPhotoUrls((cur) => cur.filter((u) => u !== url));
                        setPhotoNotes((cur) => {
                          const next = { ...cur };
                          delete next[url];
                          return next;
                        });
                      }}
                      aria-label={t.common.close}
                    >
                      ×
                    </button>
                  </div>
                  <label className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-[11px] font-medium text-app-muted">{t.qcOps.qcInspectPhotoReason}</span>
                    <input
                      type="text"
                      value={photoNotes[url] ?? ''}
                      maxLength={COMPLAINT_PHOTO_NOTE_MAX}
                      placeholder={t.qcOps.qcInspectPhotoReasonPh}
                      className="min-h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                      onChange={(e) => setPhotoNotes((cur) => ({ ...cur, [url]: e.target.value }))}
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-gray-200 dark:border-ios-dark-separator">
        <header className="bg-red-700 px-4 py-2.5 text-white dark:bg-red-800">
          <p className="text-sm font-bold">D · {t.qcOps.qcComplaintSectionD}</p>
        </header>
        <div className="space-y-3 px-3 py-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintStaff}</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={staffInvolved}
              onChange={(e) => setStaffInvolved(e.target.value)}
              maxLength={400}
              placeholder={t.qcOps.qcComplaintStaffPh}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcComplaintAction}</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder={t.qcOps.qcComplaintActionPh}
              maxLength={2000}
            />
          </label>
        </div>
      </section>

      <button
        type="button"
        disabled={busy !== null || uploading || !description.trim() || !branchId || notifyTo.length === 0}
        className="min-h-12 w-full rounded-2xl bg-red-600 text-base font-bold text-white disabled:opacity-50"
        onClick={() => void submit()}
      >
        {busy === 'submit' ? t.qcOps.qcReportsSubmitting : t.qcOps.qcComplaintSubmit}
      </button>
    </div>
  );
}
