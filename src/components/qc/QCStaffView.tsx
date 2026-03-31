'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChecklistAssignment, Checklist, ChecklistItem, QcSubmission, SubmissionPhoto } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionJumpNav } from '@/components/SectionJumpNav';

type AssignmentWithChecklist = ChecklistAssignment & {
  checklist: Checklist & { items: ChecklistItem[] };
  branch: { name: string };
};
type SubmissionWithAssignment = QcSubmission & {
  assignment: { checklist: { name: string } };
  photos: SubmissionPhoto[];
};

export function QCStaffView({
  assignments,
  submissions,
}: {
  assignments: AssignmentWithChecklist[];
  submissions: SubmissionWithAssignment[];
}) {
  const { t } = useLanguage();
  const [submissionList, setSubmissionList] = useState(submissions);
  /** Pending photo URLs per assignment (camera captures only, accumulated before submit) */
  const [pendingUrls, setPendingUrls] = useState<Record<string, string[]>>({});
  const [uploadingCapture, setUploadingCapture] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lightbox, setLightbox] = useState<{ url: string; assignmentId: string } | null>(null);

  async function uploadOneFile(file: File): Promise<string | null> {
    const form = new FormData();
    form.set('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: form });
    const d = await r.json();
    return d.url ?? null;
  }

  async function onCaptureChange(assignmentId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadingCapture(assignmentId);
    try {
      const url = await uploadOneFile(file);
      if (url) {
        setPendingUrls((prev) => ({
          ...prev,
          [assignmentId]: [...(prev[assignmentId] ?? []), url],
        }));
      }
    } finally {
      setUploadingCapture(null);
    }
  }

  async function submitPending(assignmentId: string) {
    const urls = pendingUrls[assignmentId] ?? [];
    if (urls.length === 0) return;
    setSubmittingId(assignmentId);
    try {
      const res = await fetch('/api/qc/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, photoUrls: urls }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionList((prev) => [data, ...prev]);
        setPendingUrls((prev) => {
          const next = { ...prev };
          delete next[assignmentId];
          return next;
        });
      }
    } finally {
      setSubmittingId(null);
    }
  }

  function triggerCapture(assignmentId: string) {
    fileInputRefs.current[assignmentId]?.click();
  }

  function removePending(assignmentId: string, url: string) {
    setLightbox((lb) => (lb && lb.assignmentId === assignmentId && lb.url === url ? null : lb));
    setPendingUrls((prev) => {
      const list = [...(prev[assignmentId] ?? [])];
      const index = list.indexOf(url);
      if (index === -1) return prev;
      list.splice(index, 1);
      if (list.length === 0) {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      }
      return { ...prev, [assignmentId]: list };
    });
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  const sectionClass =
    'rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-6 scroll-mt-28 app-animate-in app-surface';

  const qcStaffNavItems = [
    { id: 'qc-staff-checklists', label: t.qc.myAssignedChecklists },
    { id: 'qc-staff-submissions', label: t.qc.mySubmissions },
  ];

  return (
    <div className="space-y-6 app-stagger">
      <SectionJumpNav items={qcStaffNavItems} />
      <section id="qc-staff-checklists" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.qc.myAssignedChecklists}</h2>
        <p className="text-xs text-app-muted mb-4">{t.qc.cameraOnlyHint}</p>
        <ul className="space-y-4">
          {assignments.length === 0 && <p className="text-app-muted">{t.qc.noChecklistsAssigned}</p>}
          {assignments.map((a) => {
            const pending = pendingUrls[a.id] ?? [];
            const busy = !!submittingId || uploadingCapture === a.id;
            return (
              <li
                id={`qc-assignment-${a.id}`}
                key={a.id}
                className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4"
              >
                <h3 className="font-semibold text-app-primary">{a.checklist.name}</h3>
                <p className="text-sm text-app-secondary">{a.branch.name}</p>
                {a.checklist.items.length > 0 && (
                  <ul className="text-sm text-app-muted mt-2 list-disc list-inside">
                    {a.checklist.items.map((item) => (
                      <li key={item.id}>{item.title}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 space-y-2">
                  <label className="block text-sm font-medium text-app-primary mb-1">{t.qc.uploadPhotos}</label>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[a.id] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    aria-hidden
                    tabIndex={-1}
                    disabled={busy}
                    onChange={(e) => {
                      onCaptureChange(a.id, e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => triggerCapture(a.id)}
                      className="text-sm px-3 py-2 rounded-ios bg-ios-blue text-white disabled:opacity-50"
                    >
                      {pending.length === 0 ? t.qc.takePhoto : t.qc.addAnotherPhoto}
                    </button>
                    {pending.length > 0 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => submitPending(a.id)}
                        className="text-sm px-3 py-2 rounded-ios border border-ios-blue text-ios-blue disabled:opacity-50"
                      >
                        {t.qc.submitPhotos} ({pending.length})
                      </button>
                    )}
                  </div>
                  {uploadingCapture === a.id && <span className="text-sm text-app-muted">{t.qc.uploading}</span>}
                  {submittingId === a.id && <span className="text-sm text-app-muted">{t.qc.uploading}</span>}
                  {pending.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {pending.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setLightbox({ url, assignmentId: a.id })}
                            className="block rounded border border-gray-200 dark:border-ios-dark-separator overflow-hidden focus:outline-none focus:ring-2 focus:ring-ios-blue"
                          >
                            <img src={url} alt="" className="h-16 w-16 object-cover" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              removePending(a.id, url);
                            }}
                            className="absolute -top-2 -end-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white text-lg font-bold leading-none shadow disabled:opacity-50 hover:bg-red-700"
                            title={t.qc.removePhoto}
                            aria-label={t.qc.removePhoto}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="qc-staff-submissions" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.qc.mySubmissions}</h2>
        <ul className="space-y-3">
          {submissionList.length === 0 && <p className="text-app-muted">{t.qc.noSubmissionsYet}</p>}
          {submissionList.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-3 flex flex-wrap items-center gap-2"
            >
              <span className="font-semibold text-app-primary">{s.assignment.checklist.name}</span>
              <span className="text-sm text-app-muted">{new Date(s.submittedAt).toLocaleString()}</span>
              {s.isLate && <span className="text-xs text-amber-600 dark:text-amber-400">({t.qc.lateNote})</span>}
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  s.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-600 dark:text-white'
                    : s.status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-white'
                      : 'bg-red-100 text-red-800 dark:bg-red-600 dark:text-white'
                }`}
              >
                {t.status[s.status as keyof typeof t.status] ?? s.status}
              </span>
              {s.lateNote && <p className="w-full text-sm text-amber-600 dark:text-amber-400 mt-1">{s.lateNote}</p>}
              <div className="flex gap-1 flex-wrap">
                {s.photos.map((p) => (
                  <a key={p.id} href={p.filePath} target="_blank" rel="noopener noreferrer" className="text-sm text-ios-blue hover:underline">
                    {t.common.photo}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={t.common.photo}
        >
          <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-3">
            <button
              type="button"
              onClick={() => removePending(lightbox.assignmentId, lightbox.url)}
              className="rounded-ios bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              {t.qc.removePhoto}
            </button>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="rounded-ios bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              {t.qc.closeFullscreen}
            </button>
          </div>
          <div
            className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
              <img src={lightbox.url} alt="" className="max-h-[min(85vh,100%)] max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
