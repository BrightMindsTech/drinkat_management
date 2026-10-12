'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { isFieldVisible, uniqueSections, type FormFieldDef } from '@/lib/formTemplate';

type TaskPayload = {
  id: string;
  status: string;
  draftJson: string | null;
  fields: FormFieldDef[];
  templateVersion: { title: string };
  submittedAnswers?: Record<string, unknown> | null;
  readOnly?: boolean;
};

const TERMINAL = new Set(['completed', 'excused', 'cancelled']);

export function GuidedInspection({ taskId }: { taskId: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [task, setTask] = useState<TaskPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/inspections/tasks/${taskId}`)
      .then((r) => r.json())
      .then((data: TaskPayload) => {
        setTask(data);
        const submitted = data.submittedAnswers && typeof data.submittedAnswers === 'object' ? data.submittedAnswers : null;
        if (submitted && Object.keys(submitted).length) {
          setAnswers(submitted);
          return;
        }
        if (data.draftJson) {
          try {
            setAnswers(JSON.parse(data.draftJson) as Record<string, unknown>);
          } catch {
            /* ignore */
          }
        }
      });
  }, [taskId]);

  const readOnly = Boolean(task?.readOnly || (task && TERMINAL.has(task.status)));
  const sections = useMemo(() => uniqueSections(task?.fields ?? []), [task]);
  const current = sections[sectionIndex] ?? 'General';
  const fields = (task?.fields ?? []).filter((f) => (f.section ?? 'General') === current && isFieldVisible(f, answers));

  async function saveDraft() {
    if (readOnly) return;
    await fetch(`/api/inspections/tasks/${taskId}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    setMsg(t.qcOps.draftSaved);
  }

  async function start() {
    if (readOnly) return;
    await fetch(`/api/inspections/tasks/${taskId}/start`, { method: 'POST' });
  }

  async function uploadPhoto(key: string, file: File) {
    if (readOnly) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = (await res.json()) as { filePath?: string; error?: string };
    if (!res.ok || !json.filePath) throw new Error(json.error ?? 'upload failed');
    setAnswers((prev) => ({ ...prev, [key]: json.filePath }));
    const ai = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'photo_qc', input: { imagePath: json.filePath, requirements: { field: key } } }),
    });
    const suggestion = (await ai.json()) as { summary?: string; error?: string; code?: string };
    setAiNote(
      suggestion.error
        ? `${t.qcOps.aiUnavailable}${suggestion.code ? ` (${suggestion.code})` : ''}`
        : `${t.qcOps.photoQc}: ${suggestion.summary ?? ''} — ${t.qcOps.aiHumanConfirm}`
    );
  }

  async function submit() {
    if (readOnly) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/inspections/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const json = (await res.json()) as { error?: string; issuesCreated?: number };
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? 'Submit failed');
      return;
    }
    setMsg(`${t.qcOps.submittedOk}. ${interpolate(t.qcOps.issuesOpened, { count: json.issuesCreated ?? 0 })}`);
    router.push('/dashboard/tasks');
  }

  if (!task) return <p className="text-sm text-app-muted">…</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-app-primary">{task.templateVersion.title}</h1>
      {readOnly ? (
        <p className="rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-secondary">
          {t.qcOps.preview} · {task.status}
        </p>
      ) : null}
      <p className="text-sm text-app-secondary">
        {interpolate(t.qcOps.sectionProgress, { current: sectionIndex + 1, total: Math.max(sections.length, 1) })}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-app-border">
        <div
          className="h-full bg-app-primary"
          style={{ width: `${((sectionIndex + 1) / Math.max(sections.length, 1)) * 100}%` }}
        />
      </div>
      <div className="space-y-3 rounded-2xl border border-app-border bg-app-card p-4">
        {fields.map((field) => (
          <label key={field.key} className="block space-y-1">
            <span className="text-sm font-medium text-app-primary">
              {field.label}
              {field.required ? ` · ${t.qcOps.required}` : ''}
            </span>
            {field.type === 'select' ? (
              <select
                className="min-h-11 w-full rounded-xl border border-app-border bg-transparent p-2"
                value={String(answers[field.key] ?? '')}
                disabled={readOnly}
                onChange={(e) => setAnswers((p) => ({ ...p, [field.key]: e.target.value }))}
              >
                <option value="">—</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === 'photo' ? (
              readOnly ? (
                <span className="block min-h-11 text-xs text-app-muted">{String(answers[field.key] ?? '—')}</span>
              ) : (
                <input
                  className="min-h-11 w-full"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(field.key, file);
                  }}
                />
              )
            ) : field.type === 'checkbox' ? (
              <input
                className="min-h-11"
                type="checkbox"
                disabled={readOnly}
                checked={answers[field.key] === 'true' || answers[field.key] === true}
                onChange={(e) => setAnswers((p) => ({ ...p, [field.key]: e.target.checked ? 'true' : 'false' }))}
              />
            ) : (
              <input
                className="min-h-11 w-full rounded-xl border border-app-border bg-transparent p-2"
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                disabled={readOnly}
                value={String(answers[field.key] ?? '')}
                onChange={(e) => setAnswers((p) => ({ ...p, [field.key]: e.target.value }))}
              />
            )}
            {typeof answers[field.key] === 'string' && String(answers[field.key]).startsWith('/') ? (
              <span className="block text-xs text-app-muted">{String(answers[field.key])}</span>
            ) : null}
          </label>
        ))}
      </div>
      {msg ? <p className="text-sm text-app-secondary">{msg}</p> : null}
      {aiNote ? <p className="text-sm text-app-muted">{aiNote}</p> : null}
      <div className="flex flex-wrap gap-2">
        {readOnly ? null : (
          <>
            <button type="button" className="min-h-11 rounded-full border px-4 py-2 text-sm" onClick={() => void start()}>
              {t.qcOps.startInspection}
            </button>
            <button type="button" className="min-h-11 rounded-full border px-4 py-2 text-sm" onClick={() => void saveDraft()}>
              {t.qcOps.saveDraft}
            </button>
          </>
        )}
        {sectionIndex > 0 ? (
          <button type="button" className="min-h-11 rounded-full border px-4 py-2 text-sm" onClick={() => setSectionIndex((i) => i - 1)}>
            {t.qcOps.prevSection}
          </button>
        ) : null}
        {sectionIndex < sections.length - 1 ? (
          <button
            type="button"
            className="min-h-11 rounded-full bg-app-primary px-4 py-2 text-sm text-white"
            onClick={() => setSectionIndex((i) => i + 1)}
          >
            {t.qcOps.nextSection}
          </button>
        ) : readOnly ? null : (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-full bg-app-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void submit()}
          >
            {t.qcOps.submitInspection}
          </button>
        )}
      </div>
    </section>
  );
}
