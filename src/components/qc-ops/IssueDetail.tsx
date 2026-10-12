'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RESPONSIBILITY_CLASSES } from '@/lib/qc-domains';

type Issue = {
  id: string;
  status: string;
  severity: string;
  questionLabel: string;
  correctiveAction: string | null;
  afterPhotoPath: string | null;
  beforePhotoPath: string | null;
  events: { id: string; fromStatus: string | null; toStatus: string; createdAt: string; note: string | null }[];
  comments: { id: string; body: string; createdAt: string }[];
  responsibilityDecision: { classification: string } | null;
  viewer?: { role: string; canVerify: boolean; canUpdate: boolean };
};

export function IssueDetail({ issueId }: { issueId: string }) {
  const { t } = useLanguage();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [note, setNote] = useState('');
  const [afterPhoto, setAfterPhoto] = useState('');
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [classification, setClassification] = useState<(typeof RESPONSIBILITY_CLASSES)[number]>('unassigned');
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    const res = await fetch(`/api/issues/${issueId}`);
    setIssue((await res.json()) as Issue);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueId]);

  async function transition(status: string) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transition',
        status,
        note,
        afterPhotoPath: afterPhoto || undefined,
        correctiveAction: action || undefined,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setMsg(json.error ?? status);
    if (res.ok) await reload();
  }

  async function uploadAfter(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = (await res.json()) as { filePath?: string };
    if (json.filePath) setAfterPhoto(json.filePath);
  }

  async function sendComment() {
    await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', body: comment }),
    });
    setComment('');
    await reload();
  }

  async function approveResponsibility() {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'responsibility', classification, note }),
    });
    const json = (await res.json()) as { error?: string };
    setMsg(json.error ?? classification);
    if (res.ok) await reload();
  }

  if (!issue) return <p className="text-sm text-app-muted">…</p>;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-app-primary">{issue.questionLabel}</h1>
      <p className="text-sm text-app-muted">
        {issue.severity} · {issue.status}
      </p>
      {issue.beforePhotoPath ? (
        <p className="text-xs">
          {t.qcOps.beforePhoto}: {issue.beforePhotoPath}
        </p>
      ) : null}
      {issue.afterPhotoPath ? (
        <p className="text-xs">
          {t.qcOps.afterPhoto}: {issue.afterPhotoPath}
        </p>
      ) : null}
      <label className="block text-sm">
        {t.qcOps.correctiveAction}
        <textarea className="mt-1 w-full rounded-xl border p-2" value={action} onChange={(e) => setAction(e.target.value)} />
      </label>
      <label className="block text-sm">
        {t.qcOps.afterPhoto}
        <input
          className="min-h-11 w-full"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && void uploadAfter(e.target.files[0])}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {issue.viewer?.canUpdate || issue.viewer?.canVerify ? (
          <>
            <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('acknowledged')}>
              {t.qcOps.acknowledge}
            </button>
            <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('in_progress')}>
              {t.qcOps.startFix}
            </button>
            <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('fixed')}>
              {t.qcOps.markFixed}
            </button>
          </>
        ) : null}
        {issue.viewer?.canVerify ? (
          <>
            <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('verified')}>
              {t.qcOps.verify}
            </button>
            <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('closed')}>
              {t.qcOps.closeIssue}
            </button>
          </>
        ) : null}
        {issue.viewer?.canUpdate || issue.viewer?.canVerify ? (
          <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void transition('reopened')}>
            {t.qcOps.reopen}
          </button>
        ) : null}
      </div>
      <label className="block text-sm">
        {t.qcOps.responsibility}
        <select className="mt-1 w-full rounded-xl border p-2" value={classification} onChange={(e) => setClassification(e.target.value as typeof classification)}>
          {RESPONSIBILITY_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {issue.viewer?.canVerify ? (
        <button type="button" className="min-h-11 rounded-full border px-3 py-2 text-sm" onClick={() => void approveResponsibility()}>
          {t.qcOps.responsibility}
        </button>
      ) : null}
      <label className="block text-sm">
        {t.qcOps.comment}
        <textarea className="mt-1 w-full rounded-xl border p-2" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <button type="button" className="rounded-full border px-3 py-1 text-sm" onClick={() => void sendComment()}>
        {t.qcOps.comment}
      </button>
      <input className="w-full min-h-11 rounded-xl border p-2 text-sm" placeholder={t.qcOps.note} value={note} onChange={(e) => setNote(e.target.value)} />
      {msg ? <p className="text-sm text-app-secondary">{msg}</p> : null}
      <ul className="text-xs text-app-muted space-y-1">
        {issue.events.map((e) => (
          <li key={e.id}>
            {e.fromStatus ?? '—'} → {e.toStatus} {e.note ? `· ${e.note}` : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}
