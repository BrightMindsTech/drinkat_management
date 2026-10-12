'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Doc = {
  id: string;
  title: string;
  locale: string;
  sourceRef: string;
  approved: boolean;
  reviewStatus?: string;
  qcDomain?: string | null;
  bodyPreview?: string;
  unapprovable?: boolean;
};

type SearchOut = {
  note?: string;
  fdaIndex?: { section: string; title: string; summary: string }[];
  storedDrafts?: { id: string; title: string; sourceRef: string; excerpt: string }[];
};

export function SopDraftReview() {
  const { locale, t } = useLanguage();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState('When should food employees wash their hands?');
  const [search, setSearch] = useState<SearchOut | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function reload() {
    const res = await fetch('/api/sop/documents');
    const json = (await res.json()) as { documents?: Doc[]; sopAssistant?: string };
    setDocs(json.documents ?? []);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function runSearch() {
    const res = await fetch(`/api/sop/search?q=${encodeURIComponent(q)}&locale=${locale}`);
    setSearch((await res.json()) as SearchOut);
  }

  async function review(id: string, reviewStatus: 'qc_reviewed' | 'needs_info' | 'rejected') {
    const res = await fetch(`/api/sop/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review', reviewStatus, reviewNote: 'QC review from staging UI' }),
    });
    const json = (await res.json()) as { error?: string; approved?: boolean };
    setMsg(json.error ?? `review=${reviewStatus}; approved=${String(json.approved ?? false)}`);
    await reload();
  }

  async function adopt(id: string) {
    const res = await fetch(`/api/sop/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adopt' }),
    });
    const json = (await res.json()) as { error?: string; sourceRef?: string; approved?: boolean };
    setMsg(json.error ?? `adopted ${json.sourceRef ?? ''} approved=${String(json.approved ?? false)}`);
    await reload();
  }

  async function tryApprove(id: string) {
    const res = await fetch(`/api/sop/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    const json = (await res.json()) as { error?: string; approved?: boolean };
    setMsg(json.error ?? `approved=${String(json.approved)}`);
    await reload();
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold text-app-primary">{t.nav.sopLibrary}</h1>
      <p className="text-sm text-app-secondary">{t.qcOps.sopDraftsTitle}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="min-h-11 flex-1 rounded-xl border p-2" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="min-h-11 rounded-full border px-4 py-2 text-sm" onClick={() => void runSearch()}>
          Search drafts
        </button>
      </div>
      {search?.note ? <p className="text-sm text-app-muted">{search.note}</p> : null}
      {search?.fdaIndex?.length ? (
        <ul className="space-y-2 text-sm">
          {search.fdaIndex.map((c) => (
            <li key={c.section} className="rounded-2xl border p-3">
              <p className="font-medium">§ {c.section} {c.title}</p>
              <p className="text-app-muted">{c.summary}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="rounded-2xl border p-3 text-sm space-y-2">
            <p className="font-medium">{d.title}</p>
            <p className="text-xs text-app-muted">
              {d.locale} · {d.sourceRef} · approved={String(d.approved)} · {d.reviewStatus ?? 'draft'}
            </p>
            <p className="text-xs">{d.bodyPreview}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-full border px-3 py-2" onClick={() => void review(d.id, 'qc_reviewed')}>
                Mark QC reviewed
              </button>
              <button type="button" className="min-h-11 rounded-full border px-3 py-2" onClick={() => void review(d.id, 'needs_info')}>
                Needs DRINKAT info
              </button>
              {d.sourceRef.startsWith('DRAFT:') || d.sourceRef.startsWith('FDA:') ? (
                <button type="button" className="min-h-11 rounded-full border px-3 py-2" onClick={() => void adopt(d.id)}>
                  Adopt as DRINKAT candidate
                </button>
              ) : null}
              <button type="button" className="min-h-11 rounded-full border px-3 py-2" onClick={() => void tryApprove(d.id)}>
                {d.sourceRef.startsWith('DRINKAT-ADOPTED:') ? 'Approve adopted SOP' : 'Try approve draft (must fail)'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {msg ? <p className="text-sm text-app-secondary">{msg}</p> : null}
    </section>
  );
}
