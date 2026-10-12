'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Status = {
  live: boolean;
  blockers: string[];
  sopAssistant: string;
  models?: Record<string, string>;
};
type AiOut = { summary?: string; error?: string; code?: string; mocked?: boolean; label?: string; disclaimer?: string };

export function AiPanel() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status | null>(null);
  const [brief, setBrief] = useState<AiOut | null>(null);
  const [sop, setSop] = useState<AiOut | null>(null);
  const [coach, setCoach] = useState<AiOut | null>(null);
  const [q, setQ] = useState('');
  const [transcript, setTranscript] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [savedTranscript, setSavedTranscript] = useState<string>('');
  const [voiceLang, setVoiceLang] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ live: false, blockers: ['status_failed'], sopAssistant: 'blocked' }));
  }, []);

  async function run(kind: 'daily_brief' | 'sop' | 'coaching', input: Record<string, unknown> = {}) {
    const res = await fetch('/api/ai/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, input }),
    });
    return (await res.json()) as AiOut;
  }

  async function transcribe(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('language', voiceLang);
    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: fd });
    const json = (await res.json()) as AiOut & { suggestion?: { text?: string } };
    setTranscript(json.suggestion?.text || json.error || t.qcOps.aiUnavailable);
    setConfirmed(false);
  }

  return (
    <section id="section-ai" className="space-y-4">
      <h1 className="text-xl font-semibold text-app-primary">{t.qcOps.aiTitle}</h1>
      <p className="text-sm text-app-secondary">{t.qcOps.aiHumanConfirm}</p>
      {status && !status.live ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {t.qcOps.aiUnavailable}
          {status.blockers.length ? ` (${status.blockers.join(', ')})` : ''}
        </p>
      ) : null}
      <button
        type="button"
        className="rounded-full bg-app-primary px-4 py-2 text-sm text-white"
        onClick={async () => setBrief(await run('daily_brief'))}
      >
        {t.qcOps.dailyBrief}
      </button>
      {brief ? <OutCard data={brief} fallback={t.qcOps.aiUnavailable} /> : null}
      <button type="button" className="min-h-11 rounded-full border px-4 py-2 text-sm" onClick={async () => setCoach(await run('coaching'))}>
        {t.qcOps.coaching}
      </button>
      {coach ? <OutCard data={coach} fallback={t.qcOps.aiUnavailable} /> : null}
      <div className="space-y-2">
        <input className="w-full rounded-xl border p-2" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="rounded-full border px-4 py-2 text-sm" onClick={async () => setSop(await run('sop', { question: q }))}>
          SOP
        </button>
      </div>
      {sop ? <OutCard data={sop} fallback={t.qcOps.sopUnavailable} /> : null}
      <label className="block text-sm">
        {t.qcOps.voiceLanguage}
        <select
          className="mt-1 block min-h-11 w-full rounded-xl border p-2"
          value={voiceLang}
          onChange={(e) => setVoiceLang(e.target.value === 'ar' ? 'ar' : 'en')}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
      </label>
      <label className="block text-sm">
        {t.qcOps.voiceNotes}
        <input
          type="file"
          accept="audio/*"
          className="mt-1 block min-h-11"
          onChange={(e) => e.target.files?.[0] && void transcribe(e.target.files[0])}
        />
      </label>
      {transcript ? (
        <div className="rounded-2xl border p-3 text-sm space-y-2">
          <p>{transcript}</p>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            {t.qcOps.confirmTranscript}
          </label>
          <button
            type="button"
            disabled={!confirmed}
            className="min-h-11 rounded-full border px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => {
              if (!confirmed) return;
              setSavedTranscript(transcript);
            }}
          >
            {t.qcOps.saveTranscript}
          </button>
        </div>
      ) : null}
      {savedTranscript ? (
        <p className="text-sm text-app-secondary">
          {t.qcOps.transcriptSaved}: {savedTranscript}
        </p>
      ) : null}
    </section>
  );
}

function OutCard({ data, fallback }: { data: AiOut; fallback: string }) {
  return (
    <article className="rounded-2xl border p-3 text-sm">
      <p className="text-xs font-semibold">{data.error ? 'AI UNAVAILABLE' : data.label ?? 'AI-GENERATED'}</p>
      <p>{data.error || data.summary || fallback}</p>
      {data.code ? <p className="text-app-muted">{data.code}</p> : null}
      {data.disclaimer ? <p className="text-app-muted">{data.disclaimer}</p> : null}
    </article>
  );
}
