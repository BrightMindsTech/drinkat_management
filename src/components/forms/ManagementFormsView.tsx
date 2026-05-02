'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormFieldDef } from '@/lib/formTemplate';
import { scrollIntoViewById } from '@/lib/scrollIntoViewDeferred';
import { downloadSubmissionReportCsv, type SubmissionReportCsvInput } from '@/lib/formSubmissionCsv';
import { FormAssignmentsPanel } from './FormAssignmentsPanel';
import { CreateFormPanel } from './CreateFormPanel';
import { FormEmployeeAssignmentsPanel } from './FormEmployeeAssignmentsPanel';

function reportedFormsStorageKey(managerUserId: string) {
  return `drinkat:forms-reported-to-owner:${managerUserId}`;
}

function readReportedFormIds(managerUserId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(reportedFormsStorageKey(managerUserId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeReportedFormIds(managerUserId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(reportedFormsStorageKey(managerUserId), JSON.stringify([...ids]));
  } catch {
    /* quota */
  }
}

export type FormsTemplateRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  departmentIds: string[];
  employeeIds?: string[];
  fields: FormFieldDef[];
};

export type FormsReviewSubmission = {
  id: string;
  status: string;
  submittedAt: Date | string;
  reviewedAt?: Date | string | null;
  rating: number | null;
  comments: string | null;
  answers: Record<string, string>;
  template: FormsTemplateRow;
  employee: { name: string };
  branch: { name: string };
  departmentName?: string | null;
  reportsToManager?: { name: string } | null;
};

export type FormsMySubmission = {
  id: string;
  status: string;
  submittedAt: Date | string;
  answers: Record<string, string>;
  template: Pick<FormsTemplateRow, 'id' | 'title' | 'category'>;
  branch: { name: string };
};

export function ManagementFormsView({
  role,
  managerUserId,
  templatesForFill,
  allTemplatesForOwner,
  departments,
  managerEmployees,
  initialReviewSubmissions,
  initialMySubmissions,
  staffEmptyHint,
  qcReviewer,
}: {
  role: string;
  managerUserId?: string;
  templatesForFill: FormsTemplateRow[];
  allTemplatesForOwner?: FormsTemplateRow[];
  departments?: { id: string; name: string }[];
  managerEmployees?: { id: string; name: string; role: string }[];
  initialReviewSubmissions: FormsReviewSubmission[];
  initialMySubmissions: FormsMySubmission[];
  staffEmptyHint?: 'noEmployee' | 'noDepartment' | 'noneForDept' | null;
  /** Login role may be `staff` while HR dept / employee role grants QC review. */
  qcReviewer?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [reviewList, setReviewList] = useState(initialReviewSubmissions);
  const [myList, setMyList] = useState(initialMySubmissions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [ownerTemplates, setOwnerTemplates] = useState<FormsTemplateRow[]>(allTemplatesForOwner ?? []);
  const [ownerEditId, setOwnerEditId] = useState<string | null>(null);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [reportingFormSubmissionId, setReportingFormSubmissionId] = useState<string | null>(null);
  const [reportedFormSubmissionIds, setReportedFormSubmissionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!managerUserId) {
      setReportedFormSubmissionIds(new Set());
      return;
    }
    setReportedFormSubmissionIds(readReportedFormIds(managerUserId));
  }, [managerUserId]);

  useLayoutEffect(() => {
    if (!ownerEditId) return;
    document.getElementById('forms-owner-edit-panel')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [ownerEditId]);

  const grouped = useMemo(() => {
    const m = new Map<string, FormsTemplateRow[]>();
    for (const tpl of templatesForFill) {
      const k = tpl.category || 'other';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(tpl);
    }
    return m;
  }, [templatesForFill]);
  const editingTemplate = useMemo(
    () => ownerTemplates.find((tpl) => tpl.id === ownerEditId) ?? null,
    [ownerTemplates, ownerEditId]
  );
  const [ownerTitle, setOwnerTitle] = useState('');
  const [ownerDescription, setOwnerDescription] = useState('');
  const [ownerCategory, setOwnerCategory] = useState('qc');
  const [ownerFields, setOwnerFields] = useState<
    { key: string; label: string; type: FormFieldDef['type']; required: boolean; optionsText: string }[]
  >([]);

  function categoryTitle(cat: string): string {
    const c = t.forms.categories as Record<string, string>;
    return c[cat] ?? t.forms.categories.other;
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    const form = new FormData();
    form.set('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: form });
    const d = await r.json();
    return d.url ?? null;
  }

  async function handleSubmit(template: FormsTemplateRow) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed');
        return;
      }
      setAnswers({});
      setOpenId(null);
      setMyList((prev) => [
        {
          id: data.id,
          status: data.status,
          submittedAt: new Date(data.submittedAt),
          answers: data.answers,
          template: { id: data.template.id, title: data.template.title, category: data.template.category },
          branch: { name: data.branch.name },
        },
        ...prev,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function startOwnerEdit(tpl: FormsTemplateRow) {
    setOwnerEditId(tpl.id);
    setOwnerTitle(tpl.title);
    setOwnerDescription(tpl.description ?? '');
    setOwnerCategory(tpl.category);
    setOwnerFields(
      tpl.fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: !!f.required,
        optionsText: f.type === 'select' ? (f.options ?? []).join('\n') : '',
      }))
    );
  }

  async function saveOwnerEdit() {
    if (!editingTemplate) return;
    const title = ownerTitle.trim();
    if (!title) return;
    if (ownerFields.length === 0) return;
    const used = new Set<string>();
    const fields: FormFieldDef[] = ownerFields.map((f, idx) => {
      const baseKey =
        (f.key || f.label)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || `field_${idx + 1}`;
      let key = baseKey;
      let i = 1;
      while (used.has(key)) {
        key = `${baseKey}_${i++}`;
      }
      used.add(key);
      const options =
        f.type === 'select'
          ? f.optionsText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      return {
        key,
        label: f.label.trim() || `Question ${idx + 1}`,
        type: f.type,
        required: f.required,
        ...(options ? { options } : {}),
      };
    });
    setOwnerSaving(true);
    try {
      const res = await fetch(`/api/forms/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: ownerDescription.trim() || null,
          category: ownerCategory,
          fields,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to update');
        return;
      }
      const updated: FormsTemplateRow = {
        id: data.id,
        category: data.category,
        title: data.title,
        description: data.description,
        departmentIds: data.departmentIds ?? [],
        employeeIds: data.employeeIds ?? [],
        fields: data.fields ?? [],
      };
      setOwnerTemplates((prev) => prev.map((tpl) => (tpl.id === updated.id ? updated : tpl)));
      setOwnerEditId(null);
    } finally {
      setOwnerSaving(false);
    }
  }

  function submissionToCsvInput(s: FormsReviewSubmission): SubmissionReportCsvInput {
    return {
      id: s.id,
      status: s.status,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      rating: s.rating,
      comments: s.comments,
      answers: s.answers,
      template: { title: s.template.title, fields: s.template.fields },
      employee: s.employee,
      branch: s.branch,
      departmentName: s.departmentName,
      reportsToManager: s.reportsToManager,
    };
  }

  async function handleExportSubmissionCsv(s: FormsReviewSubmission) {
    try {
      const base = `${s.template.title}-${s.id}`.replace(/\s+/g, '-');
      await downloadSubmissionReportCsv(submissionToCsvInput(s), base);
    } catch {
      alert(t.forms.exportCsvFailed);
    }
  }

  async function importDefaultTemplates() {
    setImportingDefaults(true);
    try {
      const res = await fetch('/api/forms/templates/import-defaults', {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? 'Failed to import templates');
        return;
      }
      router.refresh();
    } finally {
      setImportingDefaults(false);
    }
  }

  function renderField(f: FormFieldDef, tplId: string) {
    const v = answers[f.key];
    const disabled = submitting || openId !== tplId;

    const setVal = (val: unknown) => setAnswers((a) => ({ ...a, [f.key]: val }));

    switch (f.type) {
      case 'textarea':
        return (
          <label key={f.key} className="block text-sm">
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <textarea
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => setVal(e.target.value)}
              disabled={disabled}
              rows={4}
              className="mt-1.5 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2.5 text-sm text-app-primary leading-relaxed"
            />
          </label>
        );
      case 'checkbox':
        return (
          <label key={f.key} className="flex items-center gap-2.5 text-sm rounded-ios border border-gray-200 dark:border-ios-dark-separator bg-gray-50/60 dark:bg-ios-dark-elevated-2/20 px-3 py-2.5">
            <input
              type="checkbox"
              checked={v === true || v === 'true'}
              onChange={(e) => setVal(e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300"
            />
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
          </label>
        );
      case 'select':
        return (
          <label key={f.key} className="block text-sm">
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <select
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => setVal(e.target.value)}
              disabled={disabled}
              className="mt-1.5 w-full min-h-[2.75rem] rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            >
              <option value="">{t.forms.selectOption}</option>
              {(f.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        );
      case 'number':
        return (
          <label key={f.key} className="block text-sm">
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <input
              type="number"
              value={typeof v === 'number' ? v : typeof v === 'string' ? v : ''}
              onChange={(e) => setVal(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={disabled}
              className="mt-1.5 w-full min-h-[2.75rem] rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            />
          </label>
        );
      case 'date':
        return (
          <label key={f.key} className="block text-sm">
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <input
              type="date"
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => setVal(e.target.value)}
              disabled={disabled}
              className="mt-1.5 w-full min-h-[2.75rem] rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            />
          </label>
        );
      case 'photo':
        return (
          <div key={f.key} className="text-sm">
            <span className="text-app-label font-medium block mb-1">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={disabled}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = await uploadPhoto(file);
                if (url) setVal(url);
                e.target.value = '';
              }}
              className="block w-full text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1.5 file:text-ios-blue"
            />
            {typeof v === 'string' && v && (
              <a href={v} target="_blank" rel="noopener noreferrer" className="text-ios-blue text-xs mt-1 inline-block">
                {t.common.photo}
              </a>
            )}
          </div>
        );
      default:
        return (
          <label key={f.key} className="block text-sm">
            <span className="text-app-label font-medium">
              {f.label}
              {f.required ? ' *' : ''}
            </span>
            <input
              type="text"
              value={typeof v === 'string' ? v : ''}
              onChange={(e) => setVal(e.target.value)}
              disabled={disabled}
              className="mt-1.5 w-full min-h-[2.75rem] rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2 text-sm text-app-primary"
            />
          </label>
        );
    }
  }

  const sectionClass = 'app-section scroll-mt-28';

  const showReview = role === 'owner' || role === 'manager' || role === 'qc' || !!qcReviewer;
  const showFillSection =
    role === 'staff' || role === 'qc' || role === 'marketing' || (role === 'manager' && templatesForFill.length > 0);
  const managerCanReportForms = role === 'manager' && !!managerUserId;

  return (
    <div className="app-page">
      <h1 className="text-2xl font-bold text-app-primary mb-1">{t.forms.title}</h1>
      <p className="text-sm text-app-muted mb-4">{t.forms.intro}</p>

      {role === 'owner' && departments && (
        <section id="section-forms-owner" className={sectionClass}>
          <h2 className="text-lg font-semibold text-app-primary mb-4">{t.forms.manageFormsTitle}</h2>
          <div className="space-y-6">
            <CreateFormPanel />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={importDefaultTemplates}
                disabled={importingDefaults}
                className="app-btn-secondary"
              >
                {importingDefaults ? 'Importing templates…' : 'Import default templates'}
              </button>
            </div>
            {ownerTemplates.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-app-primary mb-3">Edit form content</h3>
                <ul className="space-y-2">
                  {ownerTemplates.map((tpl) => (
                    <li key={tpl.id} className="rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-app-primary truncate">{tpl.title}</p>
                        <p className="text-xs text-app-muted">{categoryTitle(tpl.category)} - {tpl.fields.length} fields</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <button type="button" onClick={() => startOwnerEdit(tpl)} className="app-btn-secondary">
                          {t.common.edit}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {editingTemplate && (
                  <div
                    id="forms-owner-edit-panel"
                    className="mt-4 scroll-mt-28 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-base font-semibold text-app-primary">{t.common.edit}: {editingTemplate.title}</h4>
                      <button type="button" onClick={() => setOwnerEditId(null)} className="app-btn-secondary !min-h-[2rem] !px-3">
                        {t.common.cancel}
                      </button>
                    </div>
                    <label className="block text-sm text-app-label">
                      {t.forms.createFormName}
                      <input value={ownerTitle} onChange={(e) => setOwnerTitle(e.target.value)} className="app-input mt-1.5" />
                    </label>
                    <label className="block text-sm text-app-label">
                      {t.forms.createFormDescription}
                      <textarea value={ownerDescription} onChange={(e) => setOwnerDescription(e.target.value)} rows={2} className="app-input mt-1.5" />
                    </label>
                    <label className="block text-sm text-app-label">
                      {t.forms.createFormCategory}
                      <select value={ownerCategory} onChange={(e) => setOwnerCategory(e.target.value)} className="app-select mt-1.5">
                        <option value="qc">{(t.forms.categories as Record<string, string>).qc}</option>
                        <option value="marketing">{(t.forms.categories as Record<string, string>).marketing}</option>
                        <option value="kitchen">{(t.forms.categories as Record<string, string>).kitchen}</option>
                        <option value="cash">{(t.forms.categories as Record<string, string>).cash}</option>
                      </select>
                    </label>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-app-primary">{t.forms.createFormQuestions}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const insertAt = ownerFields.length;
                          flushSync(() => {
                            setOwnerFields((prev) => [
                              ...prev,
                              { key: '', label: '', type: 'text', required: false, optionsText: '' },
                            ]);
                          });
                          document
                            .getElementById(`forms-owner-field-${insertAt}`)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }}
                        className="app-btn-secondary"
                      >
                        {t.forms.addQuestion}
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {ownerFields.map((f, idx) => (
                        <li
                          id={`forms-owner-field-${idx}`}
                          key={`${f.key}-${idx}`}
                          className="scroll-mt-28 rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-app-muted">#{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setOwnerFields((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-xs text-red-600 dark:text-red-400"
                            >
                              {t.forms.removeQuestion}
                            </button>
                          </div>
                          <input
                            value={f.label}
                            onChange={(e) => setOwnerFields((prev) => prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row)))}
                            placeholder={t.forms.questionLabel}
                            className="app-input"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={f.type}
                              onChange={(e) => setOwnerFields((prev) => prev.map((row, i) => (i === idx ? { ...row, type: e.target.value as FormFieldDef['type'] } : row)))}
                              className="app-select w-auto"
                            >
                              <option value="text">{t.forms.fieldTypes.text}</option>
                              <option value="textarea">{t.forms.fieldTypes.textarea}</option>
                              <option value="number">{t.forms.fieldTypes.number}</option>
                              <option value="date">{t.forms.fieldTypes.date}</option>
                              <option value="checkbox">{t.forms.fieldTypes.checkbox}</option>
                              <option value="select">{t.forms.fieldTypes.select}</option>
                              <option value="photo">{t.forms.fieldTypes.photo}</option>
                            </select>
                            <label className="text-sm text-app-label flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={f.required}
                                onChange={(e) => setOwnerFields((prev) => prev.map((row, i) => (i === idx ? { ...row, required: e.target.checked } : row)))}
                              />
                              {t.forms.questionRequired}
                            </label>
                          </div>
                          {f.type === 'select' && (
                            <textarea
                              value={f.optionsText}
                              onChange={(e) => setOwnerFields((prev) => prev.map((row, i) => (i === idx ? { ...row, optionsText: e.target.value } : row)))}
                              rows={3}
                              placeholder={t.forms.selectOptionsPlaceholder}
                              className="app-input"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setOwnerEditId(null)} className="app-btn-secondary">
                        {t.common.cancel}
                      </button>
                      <button type="button" onClick={saveOwnerEdit} disabled={ownerSaving} className="app-btn-primary">
                        {ownerSaving ? t.common.loading : t.common.save}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {ownerTemplates.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-app-primary mb-3">{t.forms.assignTitle}</h3>
                <FormAssignmentsPanel templates={ownerTemplates} departments={departments} />
              </div>
            )}
          </div>
        </section>
      )}
      {role === 'manager' && managerEmployees && (
        <section id="section-forms-manager-assign" className={sectionClass}>
          <h2 className="text-lg font-semibold text-app-primary mb-4">{t.forms.assignTitle}</h2>
          {allTemplatesForOwner && allTemplatesForOwner.length > 0 ? (
            <FormEmployeeAssignmentsPanel templates={allTemplatesForOwner} employees={managerEmployees} />
          ) : (
            <p className="text-sm text-app-muted">{t.common.noData}</p>
          )}
        </section>
      )}

      {showFillSection && (
        <section id="section-forms-available" className={sectionClass}>
          <h2 className="text-lg font-semibold text-app-primary mb-4">{t.forms.availableForms}</h2>
          {templatesForFill.length === 0 ? (
            <div className="space-y-2">
              <p className="text-app-muted">{t.forms.noTemplates}</p>
              {staffEmptyHint === 'noEmployee' && (
                <p className="text-sm text-amber-700 dark:text-amber-300">{t.forms.staffNoEmployee}</p>
              )}
              {staffEmptyHint === 'noDepartment' && (
                <p className="text-sm text-amber-700 dark:text-amber-300">{t.forms.staffNoDepartment}</p>
              )}
              {staffEmptyHint === 'noneForDept' && (
                <p className="text-sm text-app-secondary">{t.forms.staffNoMatchingForms}</p>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(grouped.entries()).map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="text-sm font-semibold text-app-secondary mb-3 uppercase tracking-wide">
                    {categoryTitle(cat)}
                  </h3>
                  <ul className="space-y-3">
                    {list.map((tpl) => (
                      <li
                        key={tpl.id}
                        className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-app-primary">{tpl.title}</h4>
                            {tpl.description && (
                              <p className="text-sm text-app-muted mt-1">{tpl.description}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenId((prev) => {
                                const next = prev === tpl.id ? null : tpl.id;
                                if (next === tpl.id) {
                                  setAnswers({});
                                  scrollIntoViewById(`forms-fill-body-${tpl.id}`);
                                }
                                return next;
                              });
                            }}
                            className="app-btn-primary !min-h-[2.1rem] !px-3 !py-1.5 !text-sm !font-medium"
                          >
                            {openId === tpl.id ? t.forms.collapse : t.forms.expand}
                          </button>
                        </div>
                        {openId === tpl.id && (
                          <div id={`forms-fill-body-${tpl.id}`} className="mt-4 scroll-mt-28 space-y-3">
                            <p className="text-xs text-app-muted">Fields marked with * are required.</p>
                            {tpl.fields.map((f) => (
                              <div key={f.key} className="rounded-ios border border-gray-200 dark:border-ios-dark-separator bg-white/70 dark:bg-ios-dark-elevated-2/20 p-3">
                                {renderField(f, tpl.id)}
                              </div>
                            ))}
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setOpenId(null)} className="app-btn-secondary">
                                {t.common.cancel}
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSubmit(tpl)}
                                className="app-btn-primary"
                              >
                                {submitting ? t.forms.submitting : t.forms.submit}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(role === 'staff' || role === 'qc' || role === 'marketing' || role === 'manager') && myList.length > 0 && (
        <section id="section-forms-my-submissions" className={sectionClass}>
          <h2 className="text-lg font-semibold text-app-primary mb-4">{t.forms.mySubmissions}</h2>
          <ul className="space-y-3 text-sm">
            {myList.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-gray-100 dark:border-ios-dark-separator pb-3 last:border-0 last:pb-0"
              >
                <span className="font-semibold text-app-primary">{s.template.title}</span>
                <span className="text-app-secondary font-semibold">{s.branch.name}</span>
                <span className="text-xs tabular-nums text-app-muted">
                  {new Date(s.submittedAt).toLocaleString()}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    s.status === 'pending'
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-600/90 dark:text-white'
                      : s.status === 'approved'
                        ? 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100'
                        : 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100'
                  }`}
                >
                  {t.status[s.status as keyof typeof t.status] ?? s.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showReview && (
        <section id="section-forms-review" className={sectionClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-app-primary">{t.forms.reviewQueue}</h2>
            <span className="rounded-md bg-ios-blue/10 px-2.5 py-1 text-xs font-semibold text-ios-blue">
              {t.common.total}: {reviewList.length}
            </span>
          </div>
          {reviewList.length === 0 ? (
            <p className="text-sm text-app-muted">{t.common.noData}</p>
          ) : (
            <ul className="space-y-5">
              {reviewList.map((s) => (
              <li
                id={`forms-review-submission-${s.id}`}
                key={s.id}
                className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated-2 p-4 sm:p-5 shadow-sm dark:shadow-none space-y-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-3 sm:gap-y-1">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-app-primary break-words">{s.template.title}</p>
                    <p className="text-sm text-app-secondary">
                      <span className="font-medium text-app-primary">{s.employee.name}</span> · {s.branch.name}
                    </p>
                    <p className="text-sm text-app-secondary mt-1">
                      <span className="text-app-label">{t.forms.submittedToManager}</span>{' '}
                      <span className="font-medium text-app-primary">{s.reportsToManager?.name ?? '—'}</span>
                    </p>
                  </div>
                  <div className="sm:ms-auto flex flex-col items-stretch sm:items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          s.status === 'approved'
                            ? 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100'
                            : s.status === 'denied'
                              ? 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100'
                              : 'bg-ios-blue/15 text-ios-blue dark:bg-ios-blue/25 dark:text-ios-blue'
                        }`}
                      >
                        {t.status[s.status as keyof typeof t.status] ?? s.status}
                      </span>
                      {showReview && (
                        <button
                          type="button"
                          onClick={() => handleExportSubmissionCsv(s)}
                          className="rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-2.5 py-1.5 text-xs font-medium text-app-primary hover:bg-gray-50 dark:hover:bg-ios-dark-fill"
                        >
                          {t.forms.exportSubmissionCsv}
                        </button>
                      )}
                    </div>
                    <span className="text-xs tabular-nums text-app-muted text-end">{new Date(s.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
                <dl className="space-y-2 text-sm border-t border-gray-100 dark:border-ios-dark-separator pt-3">
                  {s.template.fields.map((f, idx) => (
                    <div
                      key={f.key}
                      className={`grid grid-cols-1 gap-0.5 rounded-md px-2 py-1.5 sm:grid-cols-[minmax(8rem,11rem)_1fr] sm:gap-x-4 sm:items-start ${
                        idx % 2 === 0 ? 'bg-gray-50/80 dark:bg-ios-dark-elevated/30' : ''
                      }`}
                    >
                      <dt className="text-app-label leading-snug">
                        {f.label}:
                      </dt>
                      <dd className="text-app-primary break-words leading-snug">
                        {f.type === 'photo' && s.answers[f.key] ? (
                          <a
                            href={s.answers[f.key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-ios-blue hover:underline"
                          >
                            {t.common.photo}
                          </a>
                        ) : (
                          (s.answers[f.key] ?? '—')
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {(s.status === 'approved' || s.status === 'denied') && (s.rating != null || s.comments) ? (
                  <div className="text-sm border-t border-gray-100 dark:border-ios-dark-separator pt-3 space-y-1">
                    <p className="text-app-secondary">
                      <span className="font-medium text-app-primary">{t.status[s.status as keyof typeof t.status]}</span>
                      {s.rating != null ? ` · ${t.qc.rating}: ${s.rating}/5` : ''}
                    </p>
                    {s.comments ? <p className="text-app-secondary">{s.comments}</p> : null}
                  </div>
                ) : null}
                {managerCanReportForms && (
                  <div className="border-t border-gray-100 dark:border-ios-dark-separator pt-3">
                    <button
                      type="button"
                      disabled={
                        reportingFormSubmissionId === s.id || reportedFormSubmissionIds.has(s.id)
                      }
                      className="rounded-lg border border-ios-blue/40 px-2.5 py-1.5 text-xs font-medium text-ios-blue disabled:opacity-50"
                      onClick={async () => {
                        if (!managerUserId) return;
                        setReportingFormSubmissionId(s.id);
                        try {
                          const res = await fetch(`/api/forms/submissions/${s.id}/report-to-owner`, {
                            method: 'POST',
                          });
                          if (!res.ok) {
                            const data = (await res.json().catch(() => ({}))) as { error?: string };
                            alert(data.error ?? t.forms.reportFormToOwnerFailed);
                            return;
                          }
                          setReportedFormSubmissionIds((prev) => {
                            const next = new Set(prev);
                            next.add(s.id);
                            writeReportedFormIds(managerUserId, next);
                            return next;
                          });
                        } finally {
                          setReportingFormSubmissionId(null);
                        }
                      }}
                    >
                      {reportedFormSubmissionIds.has(s.id)
                        ? t.forms.reportedFormToOwner
                        : t.forms.reportFormToOwner}
                    </button>
                  </div>
                )}
              </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
