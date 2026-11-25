'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppModal } from '@/components/AppModal';
import { BRANCH_INSPECTION_KIND } from '@/lib/qc-branch-inspection';
import { CUSTOMER_COMPLAINT_KIND } from '@/lib/qc-complaints';
import { WAREHOUSE_INSPECTION_KIND } from '@/lib/qc-warehouse-inspection';
import {
  asComplaintTemplate,
  asInspectionTemplate,
  publicQcFormCatalog,
  type ComplaintFormTemplate,
  type InspectionFormTemplate,
  type QcEditableFormKind,
  type QcFormTemplate,
} from '@/lib/qc-form-templates';

export type QcLiveTemplates = {
  branch_inspection: InspectionFormTemplate;
  warehouse_inspection: InspectionFormTemplate;
  customer_complaint: ComplaintFormTemplate;
};

type Mode = 'add' | 'delete';
type Step = 'closed' | 'mode' | 'form' | 'work';

export function QcTemplateEditor({
  templates,
  onTemplates,
}: {
  templates: QcLiveTemplates | null;
  onTemplates: (next: QcLiveTemplates) => void;
}) {
  const { t, locale } = useLanguage();
  const [step, setStep] = useState<Step>('closed');
  const [mode, setMode] = useState<Mode | null>(null);
  const [kind, setKind] = useState<QcEditableFormKind | null>(null);
  const [sectionId, setSectionId] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const catalog = useMemo(
    () =>
      templates
        ? publicQcFormCatalog(templates).forms
        : publicQcFormCatalog({
            branch_inspection: { v: 1, kind: BRANCH_INSPECTION_KIND, sections: [], retiredItems: [] },
            warehouse_inspection: { v: 1, kind: WAREHOUSE_INSPECTION_KIND, sections: [], retiredItems: [] },
            customer_complaint: { v: 1, kind: CUSTOMER_COMPLAINT_KIND, channels: [], retiredChannels: [] },
          }).forms,
    [templates]
  );

  const live: QcFormTemplate | null = kind && templates ? templates[kind] : null;
  const inspection = live ? asInspectionTemplate(live) : null;
  const complaint = live ? asComplaintTemplate(live) : null;

  function close() {
    if (busy) return;
    setStep('closed');
    setMode(null);
    setKind(null);
    setSectionId('');
    setTitleEn('');
    setTitleAr('');
    setErr(null);
    setMsg(null);
  }

  async function save(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch('/api/qc-reports/templates', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { templates?: QcLiveTemplates; error?: string };
      if (!res.ok || !json.templates) {
        setErr(json.error || t.qcOps.qcTplFailed);
        return;
      }
      onTemplates(json.templates);
      setTitleEn('');
      setTitleAr('');
      setMsg(t.qcOps.qcTplSaved);
    } catch {
      setErr(t.qcOps.qcTplFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStep('mode');
          setErr(null);
          setMsg(null);
        }}
        className="min-h-12 w-full rounded-2xl border border-dashed border-gray-300 text-base font-semibold text-app-primary touch-manipulation active:opacity-90 dark:border-ios-dark-separator sm:col-span-2"
      >
        {t.qcOps.qcTplEdit}
      </button>

      <AppModal
        open={step !== 'closed'}
        onClose={close}
        aria-label={t.qcOps.qcTplEdit}
        overlayClassName="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 overscroll-none"
        panelClassName="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl dark:bg-ios-dark-elevated"
      >
        <div className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-app-primary">{t.qcOps.qcTplEdit}</h2>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-app-muted disabled:opacity-50"
              aria-label={t.qcOps.qcReportsCancel}
            >
              ×
            </button>
          </div>
          <p className="text-sm leading-relaxed text-app-muted">{t.qcOps.qcTplHint}</p>
          {err ? <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{err}</p> : null}
          {msg ? <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700">{msg}</p> : null}

          {step === 'mode' ? (
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                className="min-h-[5.5rem] rounded-3xl bg-ios-blue px-4 py-4 text-start text-white touch-manipulation active:opacity-90"
                onClick={() => {
                  setMode('add');
                  setStep('form');
                }}
              >
                <p className="text-lg font-bold">{t.qcOps.qcTplAdd}</p>
                <p className="mt-1 text-sm text-white/80">{t.qcOps.qcTplAddHint}</p>
              </button>
              <button
                type="button"
                className="min-h-[5.5rem] rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-start touch-manipulation active:opacity-90 dark:border-red-900/50 dark:bg-red-950/30"
                onClick={() => {
                  setMode('delete');
                  setStep('form');
                }}
              >
                <p className="text-lg font-bold text-red-700 dark:text-red-300">{t.qcOps.qcTplDelete}</p>
                <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">{t.qcOps.qcTplDeleteHint}</p>
              </button>
            </div>
          ) : null}

          {step === 'form' ? (
            <div className="space-y-2">
              <button
                type="button"
                className="text-sm font-semibold text-ios-blue"
                onClick={() => {
                  setStep('mode');
                  setKind(null);
                }}
              >
                ← {t.qcOps.qcTplBack}
              </button>
              {catalog.map((form) => (
                <button
                  key={form.kind}
                  type="button"
                  className="flex min-h-14 w-full items-center rounded-2xl border border-gray-200 px-4 text-start text-base font-semibold text-app-primary touch-manipulation dark:border-ios-dark-separator"
                  onClick={() => {
                    setKind(form.kind);
                    setStep('work');
                    setSectionId('');
                    setMsg(null);
                    setErr(null);
                  }}
                >
                  {locale === 'ar' ? form.titleAr : form.titleEn}
                </button>
              ))}
            </div>
          ) : null}

          {step === 'work' && mode === 'add' && inspection ? (
            <div className="space-y-3">
              <button type="button" className="text-sm font-semibold text-ios-blue" onClick={() => setStep('form')}>
                ← {t.qcOps.qcTplBack}
              </button>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-app-muted">{t.qcOps.qcTplSection}</span>
                <select
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                >
                  <option value="">{t.qcOps.qcTplSectionPh}</option>
                  {inspection.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {locale === 'ar' ? s.titleAr : s.titleEn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-app-muted">{t.qcOps.qcTplTitleEn}</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                  value={titleEn}
                  maxLength={80}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-app-muted">{t.qcOps.qcTplTitleAr}</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                  value={titleAr}
                  maxLength={80}
                  onChange={(e) => setTitleAr(e.target.value)}
                  dir="rtl"
                />
              </label>
              <button
                type="button"
                disabled={busy || !sectionId || !titleEn.trim() || !titleAr.trim()}
                className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-bold text-white disabled:opacity-50"
                onClick={() =>
                  void save({
                    kind: inspection.kind,
                    action: 'add',
                    sectionId,
                    titleEn,
                    titleAr,
                  })
                }
              >
                {busy ? t.qcOps.qcTplSaving : t.qcOps.qcTplAddSave}
              </button>
            </div>
          ) : null}

          {step === 'work' && mode === 'add' && complaint ? (
            <div className="space-y-3">
              <button type="button" className="text-sm font-semibold text-ios-blue" onClick={() => setStep('form')}>
                ← {t.qcOps.qcTplBack}
              </button>
              <p className="text-sm text-app-muted">{t.qcOps.qcTplComplaintAddHint}</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-app-muted">{t.qcOps.qcTplTitleEn}</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                  value={titleEn}
                  maxLength={80}
                  onChange={(e) => setTitleEn(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-app-muted">{t.qcOps.qcTplTitleAr}</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
                  value={titleAr}
                  maxLength={80}
                  onChange={(e) => setTitleAr(e.target.value)}
                  dir="rtl"
                />
              </label>
              <button
                type="button"
                disabled={busy || !titleEn.trim() || !titleAr.trim()}
                className="min-h-12 w-full rounded-2xl bg-ios-blue text-base font-bold text-white disabled:opacity-50"
                onClick={() => void save({ kind: CUSTOMER_COMPLAINT_KIND, action: 'add', titleEn, titleAr })}
              >
                {busy ? t.qcOps.qcTplSaving : t.qcOps.qcTplAddSave}
              </button>
            </div>
          ) : null}

          {step === 'work' && mode === 'delete' && inspection ? (
            <div className="space-y-3">
              <button type="button" className="text-sm font-semibold text-ios-blue" onClick={() => setStep('form')}>
                ← {t.qcOps.qcTplBack}
              </button>
              <p className="text-sm text-app-muted">{t.qcOps.qcTplDeletePick}</p>
              {inspection.sections.map((section) => (
                <div key={section.id}>
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    {section.id} · {locale === 'ar' ? section.titleAr : section.titleEn}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={busy}
                          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-gray-200 px-3 text-start text-sm disabled:opacity-50 dark:border-ios-dark-separator"
                          onClick={() => {
                            if (!window.confirm(t.qcOps.qcTplDeleteConfirm)) return;
                            void save({ kind: inspection.kind, action: 'delete', itemId: item.id });
                          }}
                        >
                          <span>
                            {item.n}. {locale === 'ar' ? item.titleAr : item.titleEn}
                          </span>
                          <span className="text-red-600">{t.qcOps.qcTplDelete}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {step === 'work' && mode === 'delete' && complaint ? (
            <div className="space-y-3">
              <button type="button" className="text-sm font-semibold text-ios-blue" onClick={() => setStep('form')}>
                ← {t.qcOps.qcTplBack}
              </button>
              <p className="text-sm text-app-muted">{t.qcOps.qcTplDeletePick}</p>
              <ul className="space-y-1">
                {complaint.channels.map((ch) => (
                  <li key={ch.id}>
                    <button
                      type="button"
                      disabled={busy}
                      className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-gray-200 px-3 text-start text-sm disabled:opacity-50 dark:border-ios-dark-separator"
                      onClick={() => {
                        if (!window.confirm(t.qcOps.qcTplDeleteConfirm)) return;
                        void save({ kind: CUSTOMER_COMPLAINT_KIND, action: 'delete', channelId: ch.id });
                      }}
                    >
                      <span>{locale === 'ar' ? ch.titleAr : ch.titleEn}</span>
                      <span className="text-red-600">{t.qcOps.qcTplDelete}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
