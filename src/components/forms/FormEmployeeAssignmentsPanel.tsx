'use client';

import { useEffect, useState } from 'react';
import type { FormsTemplateRow } from './ManagementFormsView';
import { useLanguage } from '@/contexts/LanguageContext';

export function FormEmployeeAssignmentsPanel({
  templates,
  employees,
}: {
  templates: FormsTemplateRow[];
  employees: { id: string; name: string; role: string }[];
}) {
  const { t } = useLanguage();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(templates.map((tpl) => [tpl.id, [...(tpl.employeeIds ?? [])]]))
  );

  const templatesKey = templates.map((x) => `${x.id}:${(x.employeeIds ?? []).join(',')}`).join('|');
  useEffect(() => {
    setLocal(Object.fromEntries(templates.map((tpl) => [tpl.id, [...(tpl.employeeIds ?? [])]])));
  }, [templatesKey]);

  function toggle(templateId: string, employeeId: string) {
    setLocal((prev) => {
      const cur = new Set(prev[templateId] ?? []);
      if (cur.has(employeeId)) cur.delete(employeeId);
      else cur.add(employeeId);
      return { ...prev, [templateId]: Array.from(cur) };
    });
  }

  async function save(templateId: string) {
    setSavingId(templateId);
    setSavedId(null);
    try {
      const res = await fetch(`/api/forms/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds: local[templateId] ?? [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert((data as { error?: string }).error ?? 'Failed');
        return;
      }
      setSavedId(templateId);
      window.setTimeout(() => setSavedId((cur) => (cur === templateId ? null : cur)), 2200);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-app-secondary">{t.forms.assignIntro}</p>
      {templates.map((tpl) => (
        <div
          key={tpl.id}
          className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4"
        >
          <h4 className="font-medium text-app-primary mb-2">{tpl.title}</h4>
          <div className="flex flex-wrap gap-3">
            {employees.map((emp) => (
              <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={(local[tpl.id] ?? []).includes(emp.id)}
                  onChange={() => toggle(tpl.id, emp.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-app-primary">{emp.name} ({emp.role})</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => save(tpl.id)}
              disabled={savingId === tpl.id}
              className="text-sm px-3 py-1.5 rounded-ios bg-ios-blue text-white disabled:opacity-50"
            >
              {savingId === tpl.id ? t.common.loading : t.forms.saveAssignments}
            </button>
            {savedId === tpl.id && <span className="text-sm text-green-600 dark:text-green-400">{t.forms.assignmentsSaved}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

