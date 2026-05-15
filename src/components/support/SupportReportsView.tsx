'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAX_SCREENSHOTS } from '@/lib/support-reports';

type ReportRow = {
  id: string;
  title: string;
  description: string;
  screenshotPaths: string[];
  createdAt: string;
  submitter: {
    userId: string;
    displayName: string;
    email: string;
    role: string;
  };
};

export function SupportReportsView({ isOwner }: { isOwner: boolean }) {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotPaths, setScreenshotPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/support/reports', { credentials: 'include', cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as { reports?: ReportRow[]; error?: string };
      if (!res.ok) {
        setErr(j.error ?? t.support.loadFailed);
        setReports([]);
        return;
      }
      setReports(j.reports ?? []);
    } catch {
      setErr(t.support.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.support.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPickScreenshots(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_SCREENSHOTS - screenshotPaths.length;
    if (remaining <= 0) return;

    setUploading(true);
    setErr(null);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!file.type.startsWith('image/')) continue;
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
        if (!res.ok) {
          setErr(t.common.uploadFailed);
          continue;
        }
        const j = (await res.json()) as { filePath?: string; url?: string };
        const path = j.filePath ?? j.url;
        if (path) added.push(path);
      }
      if (added.length > 0) {
        setScreenshotPaths((prev) => [...prev, ...added].slice(0, MAX_SCREENSHOTS));
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeScreenshot(path: string) {
    setScreenshotPaths((prev) => prev.filter((p) => p !== path));
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch('/api/support/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, screenshotPaths }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof j.error === 'string' ? j.error : t.support.submitFailed);
        return;
      }
      setTitle('');
      setDescription('');
      setScreenshotPaths([]);
      await load();
    } catch {
      setErr(t.support.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReport(id: string) {
    if (!confirm(t.support.deleteConfirm)) return;
    setDeletingId(id);
    setErr(null);
    try {
      const res = await fetch(`/api/support/reports/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? t.support.deleteFailed);
        return;
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setErr(t.support.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  }

  const sectionClass = 'app-section';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-app-label">{t.support.pageTitle}</h1>
        <p className="text-sm text-app-secondary mt-1">{t.support.pageHint}</p>
      </div>

      <form onSubmit={submitReport} className={`${sectionClass} space-y-4`}>
        <h2 className="text-lg font-semibold text-app-label">{t.support.submitSection}</h2>
        <div>
          <label className="text-sm font-medium text-app-secondary">{t.support.titleLabel}</label>
          <input
            className="app-input mt-1.5 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            placeholder={t.support.titlePlaceholder}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-app-secondary">{t.support.descriptionLabel}</label>
          <textarea
            className="app-input mt-1.5 w-full min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={8000}
            placeholder={t.support.descriptionPlaceholder}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-app-secondary">{t.support.screenshotsLabel}</label>
          <p className="text-xs text-app-muted mt-0.5">
            {t.support.screenshotsHint.replace('{max}', String(MAX_SCREENSHOTS))}
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading || screenshotPaths.length >= MAX_SCREENSHOTS}
            className="mt-2 block w-full text-sm"
            onChange={onPickScreenshots}
          />
          {screenshotPaths.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {screenshotPaths.map((path) => (
                <div key={path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={path}
                    alt=""
                    className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-ios-dark-separator"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -end-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs leading-none"
                    onClick={() => removeScreenshot(path)}
                    aria-label={t.common.delete}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="app-btn-primary disabled:opacity-50"
        >
          {submitting ? t.support.submitting : t.support.submitButton}
        </button>
      </form>

      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <section className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-label mb-3">
          {isOwner ? t.support.allReportsSection : t.support.myReportsSection}
        </h2>
        {loading ? (
          <p className="text-sm text-app-secondary">{t.common.loading}</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-app-secondary">{t.support.noReports}</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-gray-200 dark:border-ios-dark-separator p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-app-label">{r.title}</p>
                    {isOwner ? (
                      <p className="text-xs text-app-muted mt-0.5">
                        {r.submitter.displayName} · {r.submitter.email} ·{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-xs text-app-muted mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      className="shrink-0 rounded-lg border border-red-300 dark:border-red-500/50 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      onClick={() => void deleteReport(r.id)}
                    >
                      {deletingId === r.id ? t.common.deleting : t.common.delete}
                    </button>
                  ) : null}
                </div>
                <p className="text-sm text-app-primary whitespace-pre-wrap">{r.description}</p>
                {r.screenshotPaths.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {r.screenshotPaths.map((path) => (
                      <a key={path} href={path} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={path}
                          alt=""
                          className="h-24 w-24 object-cover rounded-lg border border-gray-200 dark:border-ios-dark-separator"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
