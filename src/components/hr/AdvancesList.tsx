'use client';

import { useState } from 'react';
import type { Advance, Employee } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { RequestAdvanceForm } from './RequestAdvanceForm';

type AdvanceWithEmployee = Advance & { employee: Employee & { branch: { id?: string; name: string } } };

export function AdvancesList({
  advances,
  onUpdated,
  ownerView,
  onRequested,
  advanceLimit,
  approvedSum = 0,
}: {
  advances: AdvanceWithEmployee[];
  onUpdated?: (a: AdvanceWithEmployee) => void;
  ownerView?: boolean;
  onRequested?: (a: AdvanceWithEmployee) => void;
  advanceLimit?: number;
  approvedSum?: number;
}) {
  const { t } = useLanguage();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleApproveDeny(id: string, status: 'approved' | 'denied') {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/advances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && onUpdated) onUpdated(data);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {!ownerView && onRequested && (
        <RequestAdvanceForm
          onRequested={onRequested}
          advanceLimit={advanceLimit}
          approvedSum={approvedSum}
        />
      )}
      <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-hidden">
        {advances.length === 0 && <li className="p-4 text-app-muted text-sm">{t.advances.noAdvances}</li>}
        {advances.map((a) => (
          <li key={a.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-app-primary">{a.employee.name}</span>
                <span className="text-xs rounded-md px-2 py-0.5 bg-gray-100 dark:bg-ios-dark-elevated-2 text-app-secondary">{a.employee.branch.name}</span>
              </div>
              <p className="text-sm text-app-secondary mt-1">
                <span className="tabular-nums font-medium text-app-primary">{a.amount.toFixed(2)} JOD</span>
                {' · '}
                <span className="tabular-nums">{new Date(a.requestedAt).toLocaleDateString()}</span>
              </p>
              {a.note && <p className="text-sm text-app-secondary mt-1 break-words">{a.note}</p>}
              <span
                className={`inline-block mt-2 text-xs px-2 py-0.5 rounded font-medium ${
                  a.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-600 dark:text-white'
                    : a.status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-white'
                    : 'bg-red-100 text-red-800 dark:bg-red-600 dark:text-white'
                }`}
              >
                {t.status[a.status as keyof typeof t.status] ?? a.status}
              </span>
            </div>
            {ownerView && a.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApproveDeny(a.id, 'approved')}
                  disabled={updatingId === a.id}
                  className="rounded-ios bg-ios-blue text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {t.common.approve}
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveDeny(a.id, 'denied')}
                  disabled={updatingId === a.id}
                  className="rounded bg-red-600 text-white px-3 py-1 text-sm disabled:opacity-50"
                >
                  {t.common.deny}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
