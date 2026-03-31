'use client';

import { useMemo, useState } from 'react';
import { SectionJumpNav, type SectionNavItem } from '@/components/SectionJumpNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LocaleMessages } from '@/locales/en';
import type { FormFieldDef } from '@/lib/formTemplate';
import { FormAssignmentsPanel } from './FormAssignmentsPanel';
import { CreateFormPanel } from './CreateFormPanel';

export type FormsTemplateRow = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  departmentIds: string[];
  fields: FormFieldDef[];
};

export type FormsReviewSubmission = {
  id: string;
  status: string;
  submittedAt: Date | string;
  rating: number | null;
  comments: string | null;
  answers: Record<string, string>;
  template: FormsTemplateRow;
  employee: { name: string };
  branch: { name: string };
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
  templatesForFill,
  allTemplatesForOwner,
  departments,
  initialReviewSubmissions,
  initialMySubmissions,
  staffEmptyHint,
}: {
  role: string;
  templatesForFill: FormsTemplateRow[];
  allTemplatesForOwner?: FormsTemplateRow[];
  departments?: { id: string; name: string }[];
  initialReviewSubmissions: FormsReviewSubmission[];
  initialMySubmissions: FormsMySubmission[];
  staffEmptyHint?: 'noEmployee' | 'noDepartment' | 'noneForDept' | null;
}) {
  const { t } = useLanguage();
  const [reviewList, setReviewList] = useState(initialReviewSubmissions);
  const [myList, setMyList] = useState(initialMySubmissions);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, FormsTemplateRow[]>();
    for (const tpl of templatesForFill) {
      const k = tpl.category || 'other';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(tpl);
    }
    return m;
  }, [templatesForFill]);

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
      if (role === 'qc') {
        setReviewList((prev) => [
          {
            id: data.id,
            status: data.status,
            submittedAt: new Date(data.submittedAt),
            rating: data.rating,
            comments: data.comments,
            answers: data.answers,
            template: { ...template, fields: template.fields },
            employee: { name: data.employee?.name ?? '—' },
            branch: { name: data.branch?.name ?? '—' },
          },
          ...prev,
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: 'approved' | 'denied', rating: number | '', comments: string) {
    setReviewingId(id);
    try {
      const res = await fetch(`/api/forms/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rating: rating === '' ? null : rating,
          comments: comments || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed');
        return;
      }
      setReviewList((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: data.status,
                rating: data.rating,
                comments: data.comments,
              }
            : s
        )
      );
    } finally {
      setReviewingId(null);
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

  const sectionClass =
    'rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-6 scroll-mt-28 app-animate-in app-surface';

  const showReview = role === 'owner' || role === 'qc';
  const staffOrQc = role === 'staff' || role === 'qc';

  const formsNavItems = useMemo((): SectionNavItem[] => {
    const items: SectionNavItem[] = [];
    if (role === 'owner' && departments) {
      items.push({ id: 'section-forms-owner', label: t.forms.manageFormsTitle });
    }
    if (staffOrQc) {
      items.push({ id: 'section-forms-available', label: t.forms.availableForms });
    }
    if ((role === 'staff' || role === 'qc') && myList.length > 0) {
      items.push({ id: 'section-forms-my-submissions', label: t.forms.mySubmissions });
    }
    if (showReview && reviewList.length > 0) {
      items.push({ id: 'section-forms-review', label: t.forms.reviewQueue });
    }
    return items;
  }, [role, departments, staffOrQc, myList.length, showReview, reviewList.length, t]);

  return (
    <div className="space-y-6 app-stagger">
      <h1 className="text-2xl font-bold text-app-primary mb-1">{t.forms.title}</h1>
      <p className="text-sm text-app-muted mb-4">{t.forms.intro}</p>

      <SectionJumpNav items={formsNavItems} />

      {role === 'owner' && departments && (
        <section id="section-forms-owner" className={sectionClass}>
          <h2 className="text-lg font-semibold text-app-primary mb-4">{t.forms.manageFormsTitle}</h2>
          <div className="space-y-6">
            <CreateFormPanel />
            {allTemplatesForOwner && allTemplatesForOwner.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-app-primary mb-3">{t.forms.assignTitle}</h3>
                <FormAssignmentsPanel templates={allTemplatesForOwner} departments={departments} />
              </div>
            )}
          </div>
        </section>
      )}

      {staffOrQc && (
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
                              setOpenId(openId === tpl.id ? null : tpl.id);
                              setAnswers({});
                            }}
                            className="text-sm px-3 py-1.5 rounded-ios bg-ios-blue text-white"
                          >
                            {openId === tpl.id ? t.forms.collapse : t.forms.expand}
                          </button>
                        </div>
                        {openId === tpl.id && (
                          <div className="mt-4 border-t border-gray-100 dark:border-ios-dark-separator pt-4">
                            <p className="text-xs text-app-muted mb-3">Fields marked with * are required.</p>
                            <div className="space-y-3">
                              {tpl.fields.map((f) => (
                                <div key={f.key} className="rounded-ios border border-gray-200 dark:border-ios-dark-separator bg-white/70 dark:bg-ios-dark-elevated-2/20 p-3">
                                  {renderField(f, tpl.id)}
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 sticky bottom-0 bg-white/95 dark:bg-ios-dark-elevated/95 border border-gray-200 dark:border-ios-dark-separator rounded-ios p-2.5">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSubmit(tpl)}
                                className="w-full sm:w-auto px-4 py-2.5 rounded-ios bg-ios-blue text-white text-sm font-medium disabled:opacity-50"
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

      {(role === 'staff' || role === 'qc') && myList.length > 0 && (
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

      {showReview && reviewList.length > 0 && (
        <section id="section-forms-review" className={sectionClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-app-primary">{t.forms.reviewQueue}</h2>
            <span className="rounded-md bg-ios-blue/10 px-2.5 py-1 text-xs font-semibold text-ios-blue">
              {t.common.total}: {reviewList.length}
            </span>
          </div>
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
                  </div>
                  <div className="sm:ms-auto flex flex-col items-start sm:items-end gap-1">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        s.status === 'pending'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-600/90 dark:text-white'
                          : s.status === 'approved'
                            ? 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100'
                            : 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100'
                      }`}
                    >
                      {t.status[s.status as keyof typeof t.status] ?? s.status}
                    </span>
                    <span className="text-xs tabular-nums text-app-muted">{new Date(s.submittedAt).toLocaleString()}</span>
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
                {s.status === 'pending' ? (
                  <ReviewActions
                    submissionId={s.id}
                    disabled={reviewingId === s.id}
                    onReview={handleReview}
                    t={t}
                  />
                ) : (
                  <div className="text-sm border-t border-gray-100 dark:border-ios-dark-separator pt-3 space-y-1">
                    <p className="text-app-secondary">
                      <span className="font-medium text-app-primary">{t.status[s.status as keyof typeof t.status]}</span>
                      {s.rating ? ` · ${s.rating}/5` : ''}
                    </p>
                    {s.comments && <p className="text-app-secondary">{s.comments}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReviewActions({
  submissionId,
  disabled,
  onReview,
  t,
}: {
  submissionId: string;
  disabled: boolean;
  onReview: (id: string, status: 'approved' | 'denied', rating: number | '', comments: string) => void;
  t: LocaleMessages;
}) {
  const [rating, setRating] = useState<number | ''>('');
  const [comments, setComments] = useState('');

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-ios-dark-separator pt-4 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex flex-col gap-1 text-sm text-app-label">
        {t.qc.rating}
        <select
          value={rating === '' ? '' : rating}
          onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
          className="mt-0 min-h-[2.5rem] rounded-ios border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-app-primary shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
        >
          <option value="">—</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-app-label">
        {t.qc.commentsOptional}
        <input
          type="text"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[2.5rem] w-full rounded-ios border border-gray-300 bg-white px-3 py-2 text-sm text-app-primary shadow-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
        />
      </label>
      <div className="flex flex-wrap gap-2 sm:ms-auto">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReview(submissionId, 'approved', rating, comments)}
          className="min-h-[2.5rem] flex-1 rounded-ios bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 sm:flex-none dark:bg-green-600"
        >
          {t.common.approve}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReview(submissionId, 'denied', rating, comments)}
          className="min-h-[2.5rem] flex-1 rounded-ios bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 sm:flex-none dark:bg-red-600"
        >
          {t.common.deny}
        </button>
      </div>
    </div>
  );
}
