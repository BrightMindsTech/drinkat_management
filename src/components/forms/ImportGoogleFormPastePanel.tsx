'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { GOOGLE_FORM_BROWSER_EXTRACT_SCRIPT } from '@/lib/google-form-extract';

const PRIVATE_FORM_URLS = [
  {
    label: 'Form 4',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScT2rgbB_qDYaXD5C8_-J6XJDqY_vhoWNgfBaUAIvxKfsg2Fw/viewform',
  },
  {
    label: 'Form 5',
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScPWD0X38-pFW6ljHuKkgaVonid9oBCc-LhHqvKbv79p4sfNQ/viewform',
  },
] as const;

export function ImportGoogleFormPastePanel() {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [importing, setImporting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  async function copyExtractScript() {
    try {
      await navigator.clipboard.writeText(GOOGLE_FORM_BROWSER_EXTRACT_SCRIPT);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      window.prompt(t.forms.importGooglePasteCopyScriptManual, GOOGLE_FORM_BROWSER_EXTRACT_SCRIPT);
    }
  }

  async function submitPaste() {
    setImporting(true);
    try {
      const res = await fetch('/api/forms/templates/import-google-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paste }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        title?: string;
        fieldCount?: number;
        result?: 'created' | 'updated';
      };
      if (!res.ok) {
        alert(data.error ?? t.forms.importGooglePasteFailed);
        return;
      }
      alert(
        interpolate(t.forms.importGooglePasteSuccess, {
          title: data.title ?? '',
          count: String(data.fieldCount ?? 0),
        })
      );
      setPaste('');
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-ios border border-gray-200 dark:border-ios-dark-separator p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-app-primary text-left w-full"
      >
        {open ? '▼' : '▶'} {t.forms.importGooglePasteTitle}
      </button>
      {open && (
        <>
          <p className="text-xs text-app-muted whitespace-pre-line">{t.forms.importGooglePasteIntro}</p>
          <ol className="text-xs text-app-muted list-decimal list-inside space-y-1">
            <li>{t.forms.importGooglePasteStep1}</li>
            <li>{t.forms.importGooglePasteStep2}</li>
            <li>{t.forms.importGooglePasteStep3}</li>
            <li>{t.forms.importGooglePasteStep4}</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {PRIVATE_FORM_URLS.map((f) => (
              <a
                key={f.url}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-ios-blue underline"
              >
                {f.label}
              </a>
            ))}
          </div>
          <button type="button" onClick={copyExtractScript} className="app-btn-secondary text-sm">
            {copiedScript ? t.forms.importGooglePasteScriptCopied : t.forms.importGooglePasteCopyScript}
          </button>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={t.forms.importGooglePastePlaceholder}
            rows={6}
            className="w-full rounded-ios border border-gray-200 dark:border-ios-dark-separator bg-transparent px-3 py-2 text-xs font-mono text-app-primary"
          />
          <button
            type="button"
            onClick={submitPaste}
            disabled={importing || !paste.trim()}
            className="app-btn-primary text-sm"
          >
            {importing ? t.forms.importGooglePasteWorking : t.forms.importGooglePasteSubmit}
          </button>
        </>
      )}
    </div>
  );
}
