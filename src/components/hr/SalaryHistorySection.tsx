'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type SalaryCopy = { id: string; periodMonth: string; amount: number };

export function SalaryHistorySection({ employeeId, initialData }: { employeeId: string; initialData?: SalaryCopy[] }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SalaryCopy[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/employees/${employeeId}/salary-history`);
      const data = await res.json();
      if (!cancelled && res.ok) setRows(data);
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [employeeId, initialData]);

  if (loading) return <p className="text-sm text-app-muted">{t.common.loading}</p>;
  if (rows.length === 0) return <p className="text-sm text-app-muted">{t.common.noData}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-ios-dark-separator">
            <th className="text-left py-2 px-2 font-medium text-app-primary">{t.salary.periodMonth}</th>
            <th className="text-right py-2 px-2 font-medium text-app-primary">{t.salary.salary} (JOD)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 dark:border-ios-dark-separator/50">
              <td className="py-2 px-2 text-app-secondary">{r.periodMonth}</td>
              <td className="py-2 px-2 text-right font-medium text-app-primary">{r.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
