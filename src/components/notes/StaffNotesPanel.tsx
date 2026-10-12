'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubmitLock } from '@/lib/use-async-action-lock';
import type { StaffNoteAudience } from '@/lib/staff-notes';

export function StaffNotesPanel() {
  const { t } = useLanguage();
  const lock = useSubmitLock();
  const [audience, setAudience] = useState<StaffNoteAudience>('hr');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const options: { id: StaffNoteAudience; label: string; hint: string }[] = [
    { id: 'hr', label: t.notes.toHr, hint: t.notes.toHrHint },
    { id: 'owner', label: t.notes.toOwner, hint: t.notes.toOwnerHint },
    { id: 'everyone', label: t.notes.toEveryone, hint: t.notes.toEveryoneHint },
  ];

  function send() {
    void lock.run(async () => {
      setError(null);
      setOk(null);
      if (!title.trim() || !body.trim()) {
        setError(t.notes.validation);
        return;
      }
      const res = await fetch('/api/notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, title: title.trim(), body: body.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        recipients?: number;
      };
      if (!res.ok) {
        setError(json.error || t.notes.failed);
        return;
      }
      setOk(t.notes.sent);
      setTitle('');
      setBody('');
    });
  }

  return (
    <div id="section-notes" className="app-page space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-app-primary">{t.notes.title}</h1>
        <p className="text-sm text-app-muted">{t.notes.hint}</p>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{ok}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const on = audience === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={on}
              onClick={() => setAudience(opt.id)}
              className={`min-h-12 rounded-2xl border px-2 py-3 text-center ${
                on
                  ? 'border-ios-blue bg-ios-blue/10 text-app-primary'
                  : 'border-gray-200 bg-white text-app-primary dark:border-ios-dark-separator dark:bg-ios-dark-elevated'
              }`}
            >
              <p className="text-sm font-bold leading-tight">{opt.label}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-app-muted">{options.find((opt) => opt.id === audience)?.hint}</p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-app-muted">{t.notes.titleLabel}</span>
        <input
          className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-app-muted">{t.notes.bodyLabel}</span>
        <textarea
          className="min-h-36 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
          value={body}
          maxLength={500}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      <button
        type="button"
        disabled={lock.busy}
        onClick={() => send()}
        className="min-h-12 w-full rounded-full bg-ios-blue text-base font-bold text-white disabled:opacity-50"
      >
        {lock.busy ? t.notes.sending : t.notes.send}
      </button>
    </div>
  );
}
