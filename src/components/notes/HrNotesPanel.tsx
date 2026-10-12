'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubmitLock } from '@/lib/use-async-action-lock';

type Emp = { id: string; name: string; role: string; branchName: string };
type Note = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  score: number;
  tone: 'good' | 'bad' | 'neutral';
  reason: string;
  createdAt: string;
};

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function HrNotesPanel() {
  const { t, locale } = useLanguage();
  const lock = useSubmitLock();
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [q, setQ] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/hr-notes', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as { employees?: Emp[]; notes?: Note[]; error?: string };
    if (!res.ok) {
      setError(json.error || t.hrNotes.loadFailed);
      setLoading(false);
      return;
    }
    setEmployees(json.employees ?? []);
    setNotes(json.notes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return employees;
    return employees.filter((e) => `${e.name} ${e.branchName} ${e.role}`.toLowerCase().includes(needle));
  }, [employees, q]);

  const picked = employees.find((e) => e.id === employeeId) ?? null;
  const tone = score == null ? null : score > 5 ? 'good' : score < 5 ? 'bad' : 'neutral';

  function save() {
    void lock.run(async () => {
      setError(null);
      setOk(null);
      if (!employeeId || score == null || !reason.trim()) {
        setError(t.hrNotes.validation);
        return;
      }
      const res = await fetch('/api/hr-notes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, score, reason: reason.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || t.hrNotes.failed);
        return;
      }
      setOk(t.hrNotes.sent);
      setReason('');
      await load();
    });
  }

  return (
    <div id="section-hr-notes" className="app-page space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-app-primary">{t.hrNotes.title}</h1>
        <p className="text-sm text-app-muted">{t.hrNotes.hint}</p>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{ok}</p>
      ) : null}

      <input
        className="min-h-12 w-full rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.hrNotes.search}
      />

      <div className="max-h-56 overflow-y-auto rounded-3xl border border-gray-200 bg-white dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        {loading ? (
          <p className="px-4 py-6 text-sm text-app-muted">{t.common.loading}</p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-6 text-sm text-app-muted">{t.hrNotes.noPeople}</p>
        ) : (
          <ul>
            {visible.map((e) => {
              const on = employeeId === e.id;
              return (
                <li key={e.id} className="border-b border-gray-100 last:border-0 dark:border-ios-dark-separator">
                  <button
                    type="button"
                    onClick={() => setEmployeeId(e.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-start ${
                      on ? 'bg-ios-blue/10' : ''
                    }`}
                  >
                    <span>
                      <span className="block font-semibold text-app-primary">{e.name}</span>
                      <span className="block text-xs text-app-muted">
                        {[e.branchName, e.role.replaceAll('_', ' ')].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {on ? <span className="text-xs font-bold text-ios-blue">{t.hrNotes.selected}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {picked ? <p className="text-sm font-medium text-app-primary">{t.hrNotes.scoring}: {picked.name}</p> : null}

      <div>
        <p className="mb-2 text-sm font-medium text-app-muted">{t.hrNotes.scoreLabel}</p>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
          {SCORES.map((n) => {
            const on = score === n;
            const kind = n > 5 ? 'good' : n < 5 ? 'bad' : 'neutral';
            return (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`min-h-11 rounded-xl border text-sm font-bold ${
                  on
                    ? kind === 'good'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : kind === 'bad'
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-gray-700 bg-gray-700 text-white'
                    : 'border-gray-200 bg-white text-app-primary dark:border-ios-dark-separator dark:bg-ios-dark-elevated'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        {tone ? (
          <p
            className={`mt-2 text-sm font-semibold ${
              tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-app-muted'
            }`}
          >
            {tone === 'good' ? t.hrNotes.good : tone === 'bad' ? t.hrNotes.bad : t.hrNotes.neutral}
          </p>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-app-muted">{t.hrNotes.reasonLabel}</span>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-gray-200 bg-white p-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-fill"
          value={reason}
          maxLength={2000}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <button
        type="button"
        disabled={lock.busy}
        onClick={() => save()}
        className="min-h-12 w-full rounded-full bg-ios-blue text-base font-bold text-white disabled:opacity-50"
      >
        {lock.busy ? t.hrNotes.sending : t.hrNotes.send}
      </button>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-app-primary">{t.hrNotes.recent}</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-app-muted">{t.hrNotes.noneYet}</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-app-primary">{n.employeeName}</p>
                    <p className="text-xs text-app-muted">
                      {n.branchName} · {new Date(n.createdAt).toLocaleString(locale === 'ar' ? 'ar' : 'en')}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-lg font-extrabold tabular-nums ${
                      n.tone === 'good' ? 'text-emerald-700' : n.tone === 'bad' ? 'text-red-700' : 'text-app-muted'
                    }`}
                  >
                    {n.score}/10
                  </span>
                </div>
                <p className="mt-2 text-sm text-app-primary">{n.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
