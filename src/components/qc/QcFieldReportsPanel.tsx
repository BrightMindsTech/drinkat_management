'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { AppModal } from '@/components/AppModal';
import { openRearCameraCapture } from '@/lib/open-camera-file';
import { QcBranchInspectionForm } from '@/components/qc/QcBranchInspectionForm';
import {
  BRANCH_INSPECTION_SECTIONS,
  countInspectionResults,
  isBranchInspectionReport,
  parseInspectionPayload,
  parseQcReportPhotos,
} from '@/lib/qc-branch-inspection';

type Report = {
  id: string;
  category: string;
  severity: string;
  comments: string;
  photosJson: string;
  createdAt: string;
  branch: { id?: string; name: string };
  createdBy: { email: string; employee: { name: string } | null };
};
type Branch = { id: string; name: string };
type NotifyOption = { value: string; label: string };
type ComposeMode = 'note' | 'inspection' | null;
type KindFilter = 'all' | 'note' | 'inspection';

const MAX_PHOTOS = 3;

export function QcFieldReportsPanel({ canCreate }: { canCreate: boolean }) {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<Report[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState<ComposeMode>(null);
  const [comments, setComments] = useState('');
  const [branchId, setBranchId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'submit' | null>(null);
  const [q, setQ] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterKind, setFilterKind] = useState<KindFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [notifyTo, setNotifyTo] = useState('all');
  const [notifyOptions, setNotifyOptions] = useState<NotifyOption[]>([{ value: 'all', label: 'all' }]);

  const load = useCallback(async () => {
    const res = await fetch('/api/qc-reports', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json()) as {
      items?: Report[];
      branches?: Branch[];
      notifyOptions?: NotifyOption[];
      error?: string;
    };
    if (!res.ok) {
      setErr(json.error || t.qcOps.qcReportsFailed);
      setLoading(false);
      return;
    }
    setItems(json.items ?? []);
    const list = json.branches ?? [];
    setBranches(list);
    setBranchId((cur) => cur || list[0]?.id || '');
    if (json.notifyOptions?.length) setNotifyOptions(json.notifyOptions);
    setLoading(false);
  }, [t.qcOps.qcReportsFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!hash || items.length === 0) return;
    setOpenId(hash);
    setHighlightId(hash);
    requestAnimationFrame(() => {
      document.getElementById(`qc-report-${hash}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [items]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      const inspection = isBranchInspectionReport(item);
      if (filterKind === 'inspection' && !inspection) return false;
      if (filterKind === 'note' && inspection) return false;
      if (filterBranch) {
        const named = branches.find((b) => b.id === filterBranch)?.name;
        if (item.branch.id !== filterBranch && item.branch.name !== named) return false;
      }
      if (!needle) return true;
      const author = item.createdBy.employee?.name ?? item.createdBy.email;
      return `${item.comments} ${item.branch.name} ${author}`.toLowerCase().includes(needle);
    });
  }, [items, q, filterBranch, filterKind, branches]);

  async function upload(file: File) {
    if (photos.length >= MAX_PHOTOS) return;
    setBusy('upload');
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
      setPhotos((p) => [...p, d.url!].slice(0, MAX_PHOTOS));
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!branchId || !comments.trim()) {
      setErr(t.qcOps.qcReportsFailed);
      return;
    }
    setBusy('submit');
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/qc-reports', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, comments: comments.trim(), photoUrls: photos, notifyTo }),
      });
      const json = (await res.json()) as { error?: string; item?: Report };
      if (!res.ok) {
        setErr(json.error ?? t.qcOps.qcReportsFailed);
        return;
      }
      setComments('');
      setPhotos([]);
      setNotifyTo('all');
      setCompose(null);
      setMsg(t.qcOps.qcReportsSubmitted);
      await load();
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  if (canCreate && compose === 'inspection') {
    return (
      <div id="section-qc-reports" className="mx-auto max-w-xl">
        <QcBranchInspectionForm
          branches={branches}
          notifyOptions={notifyOptions}
          initialBranchId={branchId}
          onCancel={() => {
            setCompose(null);
            setErr(null);
          }}
          onSubmitted={async () => {
            setCompose(null);
            setMsg(t.qcOps.qcInspectSubmitted);
            await load();
          }}
        />
      </div>
    );
  }

  return (
    <div id="section-qc-reports" className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-primary">{t.nav.qcReports}</h1>
        <p className="mt-1 text-sm leading-relaxed text-app-muted">{t.qcOps.qcReportsHint}</p>
      </div>

      {canCreate ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setCompose('note');
            }}
            className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-semibold text-white touch-manipulation active:opacity-90"
          >
            {t.qcOps.qcReportsNew}
          </button>
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setCompose('inspection');
            }}
            className="min-h-12 w-full rounded-2xl border border-gray-200 text-base font-semibold text-app-primary touch-manipulation active:opacity-90 dark:border-ios-dark-separator"
          >
            {t.qcOps.qcInspectNew}
          </button>
        </div>
      ) : null}

      {msg ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">{msg}</p> : null}
      {compose !== 'note' && err ? (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{err}</p>
      ) : null}

      <AppModal
        open={canCreate && compose === 'note'}
        onClose={() => {
          if (busy) return;
          setCompose(null);
          setErr(null);
        }}
        aria-label={t.qcOps.qcReportsNew}
        overlayClassName="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 overscroll-none"
        panelClassName="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-ios-dark-elevated"
      >
        <div className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-app-primary">{t.qcOps.qcReportsNew}</h2>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setCompose(null);
                setErr(null);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-app-muted disabled:opacity-50"
              aria-label={t.qcOps.qcReportsCancel}
            >
              ×
            </button>
          </div>

          {err ? <p className="text-sm font-medium text-red-600">{err}</p> : null}

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

          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsNotify}</span>
            <select
              aria-label={t.qcOps.qcReportsNotify}
              className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={notifyTo}
              onChange={(e) => setNotifyTo(e.target.value)}
            >
              {notifyOptions.map((opt) => {
                let label = opt.label;
                if (opt.value === 'all') label = t.qcOps.qcReportsNotifyAll;
                else if (opt.value === 'sara') label = t.qcOps.qcReportsNotifySara;
                else if (opt.value === 'owner') label = t.qcOps.qcReportsNotifyOwner;
                else if (opt.value === 'managers') label = t.qcOps.qcReportsNotifyManagers;
                else if (opt.value.startsWith('manager:')) {
                  label = interpolate(t.qcOps.qcReportsNotifyManager, { name: opt.label });
                }
                return (
                  <option key={opt.value} value={opt.value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsComment}</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t.qcOps.qcReportsCommentPh}
              maxLength={4000}
            />
          </label>

          {photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button
                    type="button"
                    className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm text-white"
                    onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                    aria-label={t.common.close}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={busy !== null || photos.length >= MAX_PHOTOS}
            className="min-h-12 w-full rounded-2xl border border-gray-200 text-sm font-semibold disabled:opacity-50 dark:border-ios-dark-separator"
            onClick={() => {
              if (busy !== null || photos.length >= MAX_PHOTOS) return;
              openRearCameraCapture((file) => {
                void upload(file);
              });
            }}
          >
            {busy === 'upload' ? t.qcOps.qcReportsUploading : t.qcOps.qcReportsAddPhoto}
          </button>
          <button
            type="button"
            disabled={busy !== null || !comments.trim() || !branchId}
            className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-bold text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            {busy === 'submit' ? t.qcOps.qcReportsSubmitting : t.qcOps.qcReportsSubmit}
          </button>
        </div>
      </AppModal>

      <div className="flex gap-2">
        <input
          className="min-h-12 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.qcOps.qcReportsSearch}
        />
        <select
          className="min-h-12 max-w-[42%] rounded-2xl border border-gray-200 bg-white px-3 text-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
        >
          <option value="">{t.qcOps.qcReportsAllBranches}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        {(['all', 'inspection', 'note'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setFilterKind(kind)}
            className={`min-h-10 rounded-full px-3 text-xs font-semibold ${
              filterKind === kind
                ? 'bg-ios-blue text-white'
                : 'border border-gray-200 text-app-muted dark:border-ios-dark-separator'
            }`}
          >
            {kind === 'all'
              ? t.qcOps.qcInspectFilterAll
              : kind === 'inspection'
                ? t.qcOps.qcInspectFilterForms
                : t.qcOps.qcInspectFilterNotes}
          </button>
        ))}
      </div>

      <p className="text-xs font-medium text-app-muted">
        {loading ? t.qcOps.qcReportsLoading : `${visible.length}`}
      </p>

      <ul className="space-y-3">
        {visible.map((item) => {
          const inspection = parseInspectionPayload(item.photosJson);
          const photosList = parseQcReportPhotos(item.photosJson);
          const author = item.createdBy.employee?.name ?? item.createdBy.email;
          const open = openId === item.id;
          const highlight = highlightId === item.id;
          const counts = inspection ? countInspectionResults(inspection.answers) : null;
          return (
            <li
              key={item.id}
              id={`qc-report-${item.id}`}
              className={`overflow-hidden rounded-3xl border bg-white dark:bg-ios-dark-elevated ${
                highlight
                  ? 'border-ios-blue ring-2 ring-ios-blue/30'
                  : 'border-gray-200 dark:border-ios-dark-separator'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                className="w-full px-4 py-3.5 text-start touch-manipulation"
              >
                {inspection ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{t.qcOps.qcInspectNew}</p>
                    <p className="mt-1 text-sm font-semibold text-app-primary">
                      {interpolate(t.qcOps.qcInspectSummary, {
                        fail: counts?.fail ?? 0,
                        pass: counts?.pass ?? 0,
                      })}
                    </p>
                    {inspection.notes ? (
                      <p className={`${open ? '' : 'line-clamp-2'} mt-1 text-sm leading-relaxed text-app-primary`}>
                        {inspection.notes}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className={`${open ? '' : 'line-clamp-3'} text-sm leading-relaxed text-app-primary`}>
                    {item.comments}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-app-muted">
                  {item.branch.name} · {author} · {formatAppDateTime(item.createdAt, locale)}
                </p>
              </button>
              {open && inspection ? (
                <div className="space-y-3 px-4 pb-4">
                  {BRANCH_INSPECTION_SECTIONS.map((section) => (
                    <div key={section.id}>
                      <p className="text-xs font-bold text-teal-700">
                        {section.id} · {locale === 'ar' ? section.titleAr : section.titleEn}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {section.items.map((row) => {
                          const ans = inspection.answers[row.id];
                          if (!ans) return null;
                          const title = locale === 'ar' ? row.titleAr : row.titleEn;
                          const failed = ans.result === 'fail';
                          return (
                            <li key={row.id} className="flex items-start gap-2 text-sm">
                              <span className={`mt-0.5 font-bold ${failed ? 'text-red-600' : 'text-emerald-600'}`}>
                                {failed ? '×' : '✓'}
                              </span>
                              <span className="flex-1 text-app-primary">
                                {row.n}. {title}
                              </span>
                              {ans?.photoUrl ? (
                                <a href={ans.photoUrl} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={ans.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                                </a>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : open && photosList.length > 0 ? (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {photosList.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                    </a>
                  ))}
                </div>
              ) : !open && photosList.length > 0 ? (
                <p className="px-4 pb-3 text-xs font-medium text-app-muted">
                  {t.qcOps.qcReportsPhotos.replace('{count}', String(photosList.length))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-app-muted">{t.qcOps.qcReportsEmpty}</p>
      ) : null}
    </div>
  );
}
