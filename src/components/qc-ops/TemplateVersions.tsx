'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormFieldDef } from '@/lib/formTemplate';

type Version = {
  id: string;
  versionNumber: number;
  title: string;
  fields: FormFieldDef[];
  publishedAt: string;
  immutable: boolean;
};

export function TemplateVersions({ templateId }: { templateId: string }) {
  const { t } = useLanguage();
  const [currentVersionId, setCurrent] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/forms/templates/${templateId}/versions`)
      .then((r) => r.json())
      .then((j: { currentVersionId: string | null; versions: Version[] }) => {
        setCurrent(j.currentVersionId);
        setVersions(j.versions);
      });
  }, [templateId]);

  const preview = versions.find((v) => v.id === previewId);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold text-app-primary">{t.qcOps.versionsTitle}</h1>
      <ul className="space-y-2">
        {versions.map((v) => (
          <li key={v.id} className="rounded-2xl border p-3">
            <p className="font-medium">
              v{v.versionNumber} {v.id === currentVersionId ? `· ${t.qcOps.currentVersion}` : ''} · {t.qcOps.immutable}
            </p>
            <p className="text-xs text-app-muted">{v.publishedAt}</p>
            <button type="button" className="mt-2 text-sm underline" onClick={() => setPreviewId(v.id)}>
              {t.qcOps.preview}
            </button>
          </li>
        ))}
      </ul>
      {preview ? (
        <article className="rounded-2xl border p-3">
          <h2 className="font-medium">
            {t.qcOps.preview} v{preview.versionNumber}
          </h2>
          <ol className="mt-2 list-decimal pl-5 text-sm">
            {preview.fields.map((f) => (
              <li key={f.key}>
                {f.label} ({f.type}){f.section ? ` · ${f.section}` : ''}
              </li>
            ))}
          </ol>
        </article>
      ) : null}
    </section>
  );
}
