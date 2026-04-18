'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EmployeeDocument } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

const DOCUMENT_TYPES = ['criminal_record', 'contract', 'certificate', 'id_copy', 'other'] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

function documentTypeLabel(t: ReturnType<typeof useLanguage>['t'], type: string) {
  if (type === 'criminal_record') return t.employeeCard.docTypeCriminalRecord;
  if (type === 'contract') return t.employeeCard.docTypeContract;
  if (type === 'certificate') return t.employeeCard.docTypeCertificate;
  if (type === 'id_copy') return t.employeeCard.docTypeIdCopy;
  return t.employeeCard.docTypeOther;
}

function isImageUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(path);
}

export function EmployeeDocumentsSection({
  employeeId,
  documents: initialDocs,
  ownerView,
  allowSelfUpload = false,
  onDocumentsChange,
}: {
  employeeId: string;
  documents: EmployeeDocument[];
  ownerView: boolean;
  allowSelfUpload?: boolean;
  onDocumentsChange?: (docs: EmployeeDocument[]) => void;
}) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState(initialDocs);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('other');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const canUpload = ownerView || allowSelfUpload;

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
    if (!title.trim() || !documentNumber.trim() || !issuedOn) {
      setFormError(t.employeeCard.documentMetadataRequired);
      return;
    }
    setFormError(null);
    setAdding(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('title', title.trim());
      formData.set('documentType', documentType);
      formData.set('documentNumber', documentNumber.trim());
      formData.set('issuedOn', new Date(issuedOn).toISOString());
      if (expiresOn) formData.set('expiresOn', new Date(expiresOn).toISOString());
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: 'POST',
        body: formData,
      });
      const doc = (await res.json().catch(() => ({}))) as EmployeeDocument & { error?: string };
      if (res.ok) {
        const next = [doc, ...documents];
        setDocuments(next);
        onDocumentsChange?.(next);
        setTitle('');
        setDocumentType('other');
        setDocumentNumber('');
        setIssuedOn('');
        setExpiresOn('');
        setFile(null);
      } else {
        setFormError(doc.error ?? t.common.uploadFailed);
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
      {canUpload && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm w-44"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {documentTypeLabel(t, type)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.employeeCard.documentTitlePlaceholder}
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm w-32"
          />
          <input
            type="text"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder={t.employeeCard.documentNumberLabel}
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm w-36"
          />
          <input
            type="date"
            value={issuedOn}
            onChange={(e) => setIssuedOn(e.target.value)}
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
            aria-label={t.employeeCard.documentIssuedOnLabel}
          />
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
            aria-label={t.employeeCard.documentExpiresOnLabel}
          />
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1 file:text-ios-blue"
          />
          <button type="submit" disabled={adding || !file} className="rounded-ios bg-ios-blue text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50">
            {adding ? t.common.loading : t.employeeCard.addDocument}
          </button>
          {formError ? <p className="basis-full text-xs text-red-600 dark:text-red-400">{formError}</p> : null}
        </form>
      )}
      <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator">
        {documents.length === 0 && <li className="py-2 text-sm text-app-muted">{t.employeeCard.noDocuments}</li>}
        {documents.map((d) => (
          <li key={d.id} className="py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setPreview({ url: d.filePath, title: d.title })}
                className="text-ios-blue hover:underline truncate text-left min-w-0"
              >
                {d.title}
              </button>
              <p className="mt-0.5 text-[11px] text-app-secondary truncate">
                {documentTypeLabel(t, d.documentType)} · {t.employeeCard.documentNumberLabel}: {d.documentNumber ?? '—'} ·{' '}
                {t.employeeCard.documentIssuedOnLabel}:{' '}
                {d.issuedOn ? new Date(d.issuedOn).toLocaleDateString() : '—'}
                {d.expiresOn
                  ? ` · ${t.employeeCard.documentExpiresOnLabel}: ${new Date(d.expiresOn).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
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
