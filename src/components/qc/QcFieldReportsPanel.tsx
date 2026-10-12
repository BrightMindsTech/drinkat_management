'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import { AppModal } from '@/components/AppModal';

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

const MAX_PHOTOS = 3;

function parsePhotos(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((item) => String(item ?? '').trim()).filter((s) => s.length > 3);
  } catch {
    return [];
  }
}

export function QcFieldReportsPanel({ canCreate }: { canCreate: boolean }) {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<Report[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [comments, setComments] = useState('');
  const [branchId, setBranchId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'submit' | null>(null);
  const [q, setQ] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/qc-reports', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json()) as { items?: Report[]; branches?: Branch[]; error?: string };
    if (!res.ok) {
      setErr(json.error || t.qcOps.qcReportsFailed);
      setLoading(false);
      return;
    }
    setItems(json.items ?? []);
    const list = json.branches ?? [];
    setBranches(list);
    setBranchId((cur) => cur || list[0]?.id || '');
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
      if (filterBranch) {
        const named = branches.find((b) => b.id === filterBranch)?.name;
        if (item.branch.id !== filterBranch && item.branch.name !== named) return false;
      }
      if (!needle) return true;
      const author = item.createdBy.employee?.name ?? item.createdBy.email;
      return `${item.comments} ${item.branch.name} ${author}`.toLowerCase().includes(needle);
    });
  }, [items, q, filterBranch, branches]);

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
        body: JSON.stringify({ branchId, comments: comments.trim(), photoUrls: photos }),
      });
      const json = (await res.json()) as { error?: string; item?: Report };
      if (!res.ok) {
        setErr(json.error ?? t.qcOps.qcReportsFailed);
        return;
      }
      setComments('');
      setPhotos([]);
      setCompose(false);
      setMsg(t.qcOps.qcReportsSubmitted);
      await load();
    } catch {
      setErr(t.qcOps.qcReportsFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div id="section-qc-reports" className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-primary">{t.nav.qcReports}</h1>
        <p className="mt-1 text-sm leading-relaxed text-app-muted">{t.qcOps.qcReportsHint}</p>
      </div>

      {canCreate ? (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setCompose(true);
          }}
          className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-semibold text-white touch-manipulation active:opacity-90"
        >
          {t.qcOps.qcReportsNew}
        </button>
      ) : null}

      {msg ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">{msg}</p> : null}
      {!compose && err ? (
        <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{err}</p>
      ) : null}

      <AppModal
        open={canCreate && compose}
        onClose={() => {
          if (busy) return;
          setCompose(false);
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
                setCompose(false);
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
            <span className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsComment}</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t.qcOps.qcReportsCommentPh}
              maxLength={4000}
            />
          </label>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
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
            onClick={() => fileRef.current?.click()}
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

      <p className="text-xs font-medium text-app-muted">
        {loading ? t.qcOps.qcReportsLoading : `${visible.length}`}
      </p>

      <ul className="space-y-3">
        {visible.map((item) => {
          const photosList = parsePhotos(item.photosJson);
          const author = item.createdBy.employee?.name ?? item.createdBy.email;
          const open = openId === item.id;
          const highlight = highlightId === item.id;
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
                <p className={`${open ? '' : 'line-clamp-3'} text-sm leading-relaxed text-app-primary`}>
                  {item.comments}
                </p>
                <p className="mt-1.5 text-xs text-app-muted">
                  {item.branch.name} · {author} · {formatAppDateTime(item.createdAt, locale)}
                </p>
              </button>
              {open && photosList.length > 0 ? (
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
