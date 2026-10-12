'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Overview = {
  day: string;
  month: string;
  kpiMode: string;
  officialKpiBlocked: boolean;
  tasks: { status: string; _count: number }[];
  issues: { status: string; severity: string; _count: number }[];
  kpiScores: { name: string; role: string; total: number | null; mode: string }[];
};

export function QcOverview() {
  const { t } = useLanguage();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch('/api/qc/overview')
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <section id="section-overview" className="space-y-4">
      <h1 className="text-xl font-semibold text-app-primary">{t.qcOps.overviewTitle}</h1>
      <a className="text-sm underline" href="/api/qc/overview?format=csv">
        {t.qcOps.exportCsv}
      </a>
      {!data ? (
        <p className="text-sm text-app-muted">…</p>
      ) : (
        <>
          <p className="text-sm text-app-secondary">
            {data.day} · {data.month} · {data.kpiMode} {data.officialKpiBlocked ? '· official blocked' : ''}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border p-3">
              <h2 className="font-medium">{t.qcOps.myTasksTitle}</h2>
              <ul className="text-sm">
                {data.tasks.map((x) => (
                  <li key={x.status}>
                    {x.status}: {x._count}
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border p-3">
              <h2 className="font-medium">{t.qcOps.issuesTitle}</h2>
              <ul className="text-sm">
                {data.issues.map((x) => (
                  <li key={`${x.status}-${x.severity}`}>
                    {x.severity} {x.status}: {x._count}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <article className="rounded-2xl border p-3">
            <h2 className="font-medium">{t.qcOps.kpiTitle}</h2>
            <ul className="text-sm">
              {data.kpiScores.map((s) => (
                <li key={s.name}>
                  {s.name} ({s.role}): {s.total ?? '—'}
                </li>
              ))}
            </ul>
          </article>
        </>
      )}
    </section>
  );
}
