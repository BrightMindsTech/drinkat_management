'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmployeeDocument } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

function isImageUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(path);
}

export function EmployeeDocumentsSection({
  employeeId,
  documents: initialDocs,
  ownerView,
  onDocumentsChange,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  ownerView: boolean;
  onDocumentsChange?: (docs: EmployeeDocument[]) => void;
}) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState(initialDocs);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const closePreview = useCallback(() => setPreview(null), []);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview, closePreview]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setAdding(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('title', title || 'Document');
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const doc = await res.json();
      if (res.ok) {
        const next = [doc, ...documents];
        setDocuments(next);
        onDocumentsChange?.(next);
        setTitle('');
        setFile(null);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        const next = documents.filter((d) => d.id !== docId);
        setDocuments(next);
        onDocumentsChange?.(next);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2">
      {ownerView && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Contract)"
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm w-32"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1 file:text-ios-blue"
          />
          <button type="submit" disabled={adding || !file} className="rounded-ios bg-ios-blue text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
            {adding ? t.common.loading : t.employeeCard.addDocument}
          </button>
        </form>
      )}
      <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator">
        {documents.length === 0 && <li className="py-2 text-sm text-app-muted">{t.employeeCard.noDocuments}</li>}
        {documents.map((d) => (
          <li key={d.id} className="py-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPreview({ url: d.filePath, title: d.title })}
              className="text-ios-blue hover:underline truncate text-left min-w-0"
            >
              {d.title}
            </button>
            {ownerView && (
              <button type="button" onClick={() => handleDelete(d.id)} disabled={deletingId === d.id} className="text-sm text-red-600 hover:underline disabled:opacity-50 shrink-0">
                {t.common.delete}
              </button>
            )}
          </li>
        ))}
      </ul>

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-preview-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t.common.close}
            onClick={closePreview}
          />
          <div className="relative z-[101] flex w-full max-w-4xl max-h-[min(90vh,900px)] flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 dark:border-ios-dark-separator px-4 py-3">
              <h2 id="document-preview-title" className="text-base font-semibold text-app-primary truncate pr-2">
                {preview.title}
              </h2>
              <button
                type="button"
                onClick={closePreview}
                className="shrink-0 rounded-lg bg-gray-100 dark:bg-ios-dark-elevated-2 px-4 py-2 text-sm font-semibold text-app-primary hover:bg-gray-200 dark:hover:bg-ios-dark-separator"
              >
                {t.common.close}
              </button>
            </div>
            <div className="min-h-[50vh] flex-1 overflow-auto bg-gray-50 dark:bg-black/30">
              {isImageUrl(preview.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt=""
                  className="mx-auto max-h-[min(75vh,800px)] w-full object-contain"
                />
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.url}
                  className="h-[min(75vh,800px)] w-full border-0 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
