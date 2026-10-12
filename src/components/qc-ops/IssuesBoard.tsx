'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Issue = {
  id: string;
  status: string;
  severity: string;
  questionLabel: string;
  branch: { name: string } | null;
};

export function IssuesBoard() {
  const { t } = useLanguage();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/issues')
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setIssues)
      .catch(() => setErr('Forbidden or failed'));
  }, []);

  return (
    <section id="section-issues" className="space-y-3">
      <h1 className="text-xl font-semibold text-app-primary">{t.qcOps.issuesTitle}</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {issues.length === 0 ? <p className="text-sm text-app-muted">{t.qcOps.noIssues}</p> : null}
      <ul className="space-y-2">
        {issues.map((issue) => (
          <li key={issue.id}>
            <Link href={`/dashboard/issues/${issue.id}`} className="block rounded-2xl border border-app-border bg-app-card p-4">
              <p className="font-medium text-app-primary">{issue.questionLabel}</p>
              <p className="text-xs text-app-muted">
                {issue.branch?.name} · {issue.severity} · {issue.status}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
