'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import type { FormFieldDef } from '@/lib/formTemplate';

type DraftField = {
  id: string;
  label: string;
  type: FormFieldDef['type'];
  required: boolean;
  optionsText: string;
};

function slugKey(label: string, index: number, used: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `field_${index + 1}`;
  let k = base;
  let n = 0;
  while (used.has(k)) {
    n += 1;
    k = `${base}_${n}`;
  }
  used.add(k);
  return k;
}

function draftToFields(drafts: DraftField[]): FormFieldDef[] {
  const used = new Set<string>();
  return drafts.map((d, i) => {
    const key = slugKey(d.label, i, used);
    const label = d.label.trim() || `Question ${i + 1}`;
    const options =
      d.type === 'select'
        ? d.optionsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    if (d.type === 'select' && (!options || options.length === 0)) {
      throw new Error('SELECT_OPTIONS');
    }
    return {
      key,
      label,
      type: d.type,
      required: d.required,
      ...(options && options.length ? { options } : {}),
    };
  });
}

export function CreateFormPanel() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'qc' | 'marketing' | 'kitchen' | 'cash'>('qc');
  const [fields, setFields] = useState<DraftField[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        label: '',
        type: 'text',
        required: false,
        optionsText: '',
      },
    ]);
  }

  function updateField(id: string, patch: Partial<DraftField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function submit() {
    const tTitle = title.trim();
    if (!tTitle) {
      alert(t.forms.createFormTitleRequired);
      return;
    }
    if (fields.length === 0) {
      alert(t.forms.createFormNeedFields);
      return;
    }
    let built: FormFieldDef[];
    try {
      built = draftToFields(fields);
    } catch (e) {
      if (e instanceof Error && e.message === 'SELECT_OPTIONS') {
        alert(t.forms.createFormSelectNeedsOptions);
        return;
      }
      throw e;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/forms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: tTitle,
          description: description.trim() || undefined,
          fields: built,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        alert(typeof data.error === 'string' ? data.error : t.forms.createFormFailed);
        return;
      }
      setTitle('');
      setDescription('');
      setCategory('qc');
      setFields([]);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const ft = t.forms.fieldTypes;

  return (
    <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left font-semibold text-app-primary"
      >
        {t.forms.createFormToggle}
        <span className="text-ios-blue text-sm font-normal">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-ios-dark-separator pt-4">
          <p className="text-sm text-app-secondary">{t.forms.createFormIntro}</p>
          <label className="block text-sm text-app-label">
            {t.forms.createFormName} *
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            />
          </label>
          <label className="block text-sm text-app-label">
            {t.forms.createFormDescription}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            />
          </label>
          <label className="block text-sm text-app-label">
            {t.forms.createFormCategory}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="mt-1 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            >
              <option value="qc">{(t.forms.categories as Record<string, string>).qc}</option>
              <option value="marketing">{(t.forms.categories as Record<string, string>).marketing}</option>
              <option value="kitchen">{(t.forms.categories as Record<string, string>).kitchen}</option>
              <option value="cash">{(t.forms.categories as Record<string, string>).cash}</option>
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-app-label">{t.forms.createFormQuestions}</span>
              <button
                type="button"
                onClick={addField}
                className="text-sm px-3 py-1.5 rounded-ios bg-ios-blue text-white"
              >
                {t.forms.addQuestion}
              </button>
            </div>
            <ul className="space-y-3">
              {fields.map((f, idx) => (
                <li
                  key={f.id}
                  className="rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3 space-y-2 bg-gray-50/80 dark:bg-ios-dark-elevated-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-app-muted">
                      {interpolate(t.forms.questionNumber, { n: idx + 1 })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(f.id)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    >
                      {t.forms.removeQuestion}
                    </button>
                  </div>
                  <label className="block text-xs text-app-label">
                    {t.forms.questionLabel}
                    <input
                      value={f.label}
                      onChange={(e) => updateField(f.id, { label: e.target.value })}
                      className="mt-1 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-2 py-1.5 text-sm text-app-primary"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-xs text-app-label">
                      {t.forms.questionType}
                      <select
                        value={f.type}
                        onChange={(e) => updateField(f.id, { type: e.target.value as FormFieldDef['type'] })}
                        className="ml-1 rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-2 py-1 text-sm text-app-primary"
                      >
                        <option value="text">{ft.text}</option>
                        <option value="textarea">{ft.textarea}</option>
                        <option value="number">{ft.number}</option>
                        <option value="date">{ft.date}</option>
                        <option value="checkbox">{ft.checkbox}</option>
                        <option value="select">{ft.select}</option>
                        <option value="photo">{ft.photo}</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-app-label cursor-pointer">
                      <input
                        type="checkbox"
                        checked={f.required}
                        onChange={(e) => updateField(f.id, { required: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      {t.forms.questionRequired}
                    </label>
                  </div>
                  {f.type === 'select' && (
                    <label className="block text-xs text-app-label">
                      {t.forms.selectOptionsOnePerLine}
                      <textarea
                        value={f.optionsText}
                        onChange={(e) => updateField(f.id, { optionsText: e.target.value })}
                        rows={3}
                        placeholder={t.forms.selectOptionsPlaceholder}
                        className="mt-1 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-2 py-1.5 text-sm text-app-primary"
                      />
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="w-full sm:w-auto px-4 py-2.5 rounded-ios bg-ios-blue text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? t.forms.creatingForm : t.forms.createFormSubmit}
          </button>
        </div>
      )}
    </div>
  );
}
