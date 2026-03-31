'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormsTemplateRow } from './ManagementFormsView';

export function FormAssignmentsPanel({
  templates,
  departments,
}: {
  templates: FormsTemplateRow[];
  departments: { id: string; name: string }[];
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(templates.map((tpl) => [tpl.id, [...tpl.departmentIds]]))
  );

  const templatesKey = templates.map((x) => `${x.id}:${x.departmentIds.join(',')}`).join('|');
  useEffect(() => {
    setLocal(Object.fromEntries(templates.map((tpl) => [tpl.id, [...tpl.departmentIds]])));
  }, [templatesKey]);

  async function save(templateId: string) {
    setSavingId(templateId);
    setSavedId(null);
    try {
      const res = await fetch(`/api/forms/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentIds: local[templateId] ?? [] }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: unknown };
        alert(typeof d.error === 'string' ? d.error : 'Failed');
        return;
      }
      setSavedId(templateId);
      window.setTimeout(() => setSavedId((cur) => (cur === templateId ? null : cur)), 2500);
    } finally {
      setSavingId(null);
    }
  }

  function toggle(templateId: string, departmentId: string) {
    setLocal((prev) => {
      const cur = new Set(prev[templateId] ?? []);
      if (cur.has(departmentId)) cur.delete(departmentId);
      else cur.add(departmentId);
      return { ...prev, [templateId]: Array.from(cur) };
    });
  }

  async function deleteTemplate(templateId: string) {
    if (!window.confirm(t.forms.deleteFormConfirm)) return;
    setDeletingId(templateId);
    setSavedId(null);
    try {
      const res = await fetch(`/api/forms/templates/${templateId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const d = (await res.json().catch(() => ({}))) as { error?: unknown };
        alert(typeof d.error === 'string' ? d.error : t.forms.createFormFailed);
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-app-secondary">{t.forms.assignIntro}</p>
      <ul className="space-y-4">
        {templates.map((tpl) => (
          <li
            key={tpl.id}
            className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4"
          >
            <h4 className="font-medium text-app-primary mb-2">{tpl.title}</h4>
            <p className="text-xs text-app-muted mb-3">{t.forms.assignHint}</p>
            <div className="flex flex-wrap gap-3">
              {departments.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(local[tpl.id] ?? []).includes(d.id)}
                    onChange={() => toggle(tpl.id, d.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-app-primary">{d.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => save(tpl.id)}
                disabled={savingId === tpl.id || deletingId === tpl.id}
                className="text-sm px-3 py-1.5 rounded-ios bg-ios-blue text-white disabled:opacity-50"
              >
                {savingId === tpl.id ? t.common.loading : t.forms.saveAssignments}
              </button>
              {savedId === tpl.id && (
                <span className="text-sm text-green-600 dark:text-green-400">{t.forms.assignmentsSaved}</span>
              )}
              <button
                type="button"
                onClick={() => deleteTemplate(tpl.id)}
                disabled={deletingId === tpl.id || savingId === tpl.id}
                className="text-sm px-3 py-1.5 rounded-ios border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 bg-white dark:bg-ios-dark-elevated disabled:opacity-50"
              >
                {deletingId === tpl.id ? t.forms.deletingForm : t.forms.deleteForm}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
