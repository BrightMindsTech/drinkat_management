'use client';

import { useState } from 'react';
import type { EmployeeDocument } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

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
            <a href={d.filePath} target="_blank" rel="noopener noreferrer" className="text-ios-blue hover:underline truncate">
              {d.title}
            </a>
            {ownerView && (
              <button type="button" onClick={() => handleDelete(d.id)} disabled={deletingId === d.id} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                {t.common.delete}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
