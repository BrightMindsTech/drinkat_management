'use client';

import { useEffect, useMemo, useState } from 'react';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { openNativeImageSourcePick } from '@/lib/open-camera-file';
import {
  COMPLAINT_ADDITIONAL_MAX,
  COMPLAINT_CHANNELS,
  COMPLAINT_SLOT_NOTE_MAX,
  COMPLAINT_SLOTS_MAX,
  CUSTOMER_COMPLAINT_KIND,
  complaintHasContent,
  encodeComplaintPayload,
  type ComplaintSlot,
} from '@/lib/qc-complaints';
import { QcNotifyPicker, defaultNotifyTargets, notifyOptionLabel, type QcNotifyOption } from '@/components/qc/QcNotifyPicker';

type Branch = { id: string; name: string };

function emptySlots(n: number): ComplaintSlot[] {
  return Array.from({ length: n }, () => ({ note: '', photoUrl: null }));
}

export function QcComplaintForm({
  branches,
  notifyOptions,
  initialBranchId,
  reporterName,
  onCancel,
  onSubmitted,
}: {
  branches: Branch[];
  notifyOptions: QcNotifyOption[];
  initialBranchId: string;
  reporterName?: string;
  onCancel: () => void;
  onSubmitted: () => Promise<void> | void;
}) {
  const { t, locale } = useLanguage();
  const [branchId, setBranchId] = useState(initialBranchId || branches[0]?.id || '');
  const [notifyTo, setNotifyTo] = useState<string[]>(() => defaultNotifyTargets(notifyOptions));
  const [talabat, setTalabat] = useState<ComplaintSlot[]>(() => emptySlots(COMPLAINT_CHANNELS[0].startSlots));
  const [careem, setCareem] = useState<ComplaintSlot[]>(() => emptySlots(COMPLAINT_CHANNELS[1].startSlots));
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const nowLabel = useMemo(() => formatAppDateTime(new Date().toISOString(), locale), [locale]);

  useEffect(() => {
    const next = defaultNotifyTargets(notifyOptions);
    setNotifyTo((cur) => (cur.length === 1 && cur[0] === 'all' ? next : cur));
  }, [notifyOptions]);

  const ready = complaintHasContent(encodeComplaintPayload({ talabat, careem, additionalNotes }));
  const sentTo = notifyTo
    .map((value) => {
      const opt = notifyOptions.find((o) => o.value === value);
      return opt ? notifyOptionLabel(opt, t) : value;
    })
    .join(', ');

  function setSlot(channel: 'talabat' | 'careem', index: number, patch: Partial<ComplaintSlot>) {
    const setter = channel === 'talabat' ? setTalabat : setCareem;
    setter((cur) => cur.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addSlot(channel: 'talabat' | 'careem') {
    const setter = channel === 'talabat' ? setTalabat : setCareem;
    setter((cur) => (cur.length >= COMPLAINT_SLOTS_MAX ? cur : [...cur, { note: '', photoUrl: null }]));
  }

  async function attachPhoto(channel: 'talabat' | 'careem', index: number, files: File[]) {
    const file = files[0];
    if (!file || busy) return;
    setBusy(`${channel}-${index}`);
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
      setSlot(channel, index, { photoUrl: d.url });
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!branchId || busy) return;
    if (!notifyTo.length) {
      setErr(t.qcOps.qcReportsNotifyNeedOne);
      return;
    }
    if (!ready) {
      setErr(t.qcOps.qcComplaintNeedOne);
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
          talabat,
          careem,
          additionalNotes,
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

  function renderSlots(channel: 'talabat' | 'careem', rows: ComplaintSlot[]) {
    return rows.map((slot, i) => {
      const busyKey = `${channel}-${i}`;
      return (
        <div
          key={`${channel}-${i}`}
          className="grid grid-cols-1 gap-2 border-t border-gray-200 p-3 sm:grid-cols-[1fr_7.5rem] dark:border-ios-dark-separator"
        >
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-app-muted">
              {interpolate(t.qcOps.qcComplaintNote, { n: i + 1 })}
            </span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={slot.note}
              maxLength={COMPLAINT_SLOT_NOTE_MAX}
              onChange={(e) => setSlot(channel, i, { note: e.target.value })}
            />
          </label>
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-app-muted">{t.qcOps.qcComplaintPicture}</span>
            {slot.photoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slot.photoUrl} alt="" className="h-24 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                  onClick={() => setSlot(channel, i, { photoUrl: null })}
                  aria-label={t.common.close}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 px-2 text-center text-[11px] font-medium text-app-muted disabled:opacity-50 dark:border-ios-dark-separator"
                onClick={() =>
                  openNativeImageSourcePick((files) => {
                    void attachPhoto(channel, i, files);
                  })
                }
              >
                {busy === busyKey ? t.qcOps.qcReportsUploading : t.qcOps.qcComplaintAttach}
              </button>
            )}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-center sm:text-start">
          <h1 className="text-2xl font-bold uppercase tracking-[0.18em] text-slate-800 dark:text-app-primary">
            {t.qcOps.qcComplaintNew}
          </h1>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-app-muted">
            {t.qcOps.qcComplaintBrand}
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 text-sm dark:border-ios-dark-separator">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <label className="flex items-stretch border-b border-gray-200 dark:border-ios-dark-separator sm:border-e">
            <span className="flex w-28 shrink-0 items-center bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-ios-dark-elevated dark:text-app-muted">
              {t.qcOps.qcReportsBranch}
            </span>
            <select
              className="min-h-12 min-w-0 flex-1 bg-white px-3 dark:bg-ios-dark-fill"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              aria-label={t.qcOps.qcReportsBranch}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-stretch border-b border-gray-200 dark:border-ios-dark-separator">
            <span className="flex w-28 shrink-0 items-center bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-ios-dark-elevated dark:text-app-muted">
              {t.qcOps.qcComplaintDate}
            </span>
            <span className="flex min-h-12 flex-1 items-center px-3">{nowLabel}</span>
          </div>
          <div className="border-b border-gray-200 sm:col-span-2 sm:border-b-0 dark:border-ios-dark-separator">
            <div className="flex flex-col sm:flex-row sm:items-start">
              <span className="flex w-28 shrink-0 items-center bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-ios-dark-elevated dark:text-app-muted">
                {t.qcOps.qcComplaintSentTo}
              </span>
              <div className="min-w-0 flex-1 px-3 py-2">
                <QcNotifyPicker
                  options={notifyOptions}
                  selected={notifyTo}
                  onChange={setNotifyTo}
                  disabled={busy !== null}
                />
                {sentTo ? <p className="mt-1 text-xs text-app-muted">{sentTo}</p> : null}
              </div>
            </div>
          </div>
          <div className="flex items-stretch sm:col-span-2 sm:border-t sm:border-gray-200 dark:sm:border-ios-dark-separator">
            <span className="flex w-28 shrink-0 items-center bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:bg-ios-dark-elevated dark:text-app-muted">
              {t.qcOps.qcComplaintReportedBy}
            </span>
            <span className="flex min-h-12 flex-1 items-center px-3">{reporterName || '—'}</span>
          </div>
        </div>
      </div>

      {COMPLAINT_CHANNELS.map((channel) => {
        const rows = channel.id === 'talabat' ? talabat : careem;
        return (
          <section key={channel.id} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-ios-dark-separator">
            <header className="bg-teal-500 px-4 py-2.5 text-white">
              <p className="text-sm font-bold uppercase tracking-wide">
                {channel.id === 'talabat' ? '1' : '2'}. {locale === 'ar' ? channel.titleAr : channel.titleEn}
              </p>
            </header>
            {renderSlots(channel.id, rows)}
            {rows.length < COMPLAINT_SLOTS_MAX ? (
              <div className="border-t border-gray-200 p-3 dark:border-ios-dark-separator">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => addSlot(channel.id)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-teal-400 bg-teal-50 text-sm font-bold text-teal-800 disabled:opacity-50 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
                >
                  <span className="text-lg leading-none">+</span>
                  {t.qcOps.qcComplaintAddNote}
                  {` (${rows.length + 1})`}
                </button>
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="overflow-hidden rounded-2xl border border-teal-200 dark:border-teal-900/40">
        <header className="bg-teal-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
          {t.qcOps.qcComplaintAdditional}
        </header>
        <textarea
          className="min-h-24 w-full bg-white p-4 text-sm dark:bg-ios-dark-fill"
          value={additionalNotes}
          maxLength={COMPLAINT_ADDITIONAL_MAX}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />
      </section>

      <button
        type="button"
        disabled={busy !== null || !ready || !branchId || notifyTo.length === 0}
        className="min-h-12 w-full rounded-2xl bg-teal-600 text-base font-bold text-white disabled:opacity-50"
        onClick={() => void submit()}
      >
        {busy === 'submit' ? t.qcOps.qcReportsSubmitting : t.qcOps.qcComplaintSubmit}
      </button>
    </div>
  );
}
