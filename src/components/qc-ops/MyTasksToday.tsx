'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Task = {
  id: string;
  status: string;
  dueAt: string;
  branch: { name: string };
  templateVersion: { title: string; category: string };
  schedule: { label: string | null; window: string };
};

export function MyTasksToday() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/inspections/tasks')
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setTasks)
      .catch(() => setErr('Failed to load tasks'));
  }, []);

  return (
    <section id="section-tasks-today" className="space-y-3">
      <h1 className="text-xl font-semibold text-app-primary">{t.qcOps.myTasksTitle}</h1>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {tasks.length === 0 ? <p className="text-sm text-app-muted">{t.qcOps.noTasks}</p> : null}
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-2xl border border-app-border bg-app-card p-4">
            <p className="font-medium text-app-primary">{task.templateVersion.title}</p>
            <p className="text-xs text-app-muted">
              {task.branch.name} · {task.status} · {task.schedule.window}
            </p>
            <div className="mt-3">
              <Link
                href={`/dashboard/tasks/${task.id}`}
                className="inline-flex rounded-full bg-app-primary px-4 py-2 text-sm text-white"
              >
                {['completed', 'excused', 'cancelled'].includes(task.status)
                  ? t.qcOps.preview
                  : task.status === 'in_progress'
                    ? t.qcOps.continueInspection
                    : t.qcOps.startInspection}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
