'use client';

import { useState, useMemo } from 'react';
import type { Advance, Employee } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';

type AdvanceWithEmployee = Advance & { employee: Employee & { branch: { name: string } } };

export function RequestAdvanceForm({
  onRequested,
  advanceLimit,
  approvedSum = 0,
}: {
  onRequested: (a: AdvanceWithEmployee) => void;
  advanceLimit?: number;
  approvedSum?: number;
}) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remaining = advanceLimit != null ? advanceLimit - approvedSum : null;
  const wouldExceed = useMemo(() => {
    if (advanceLimit == null || remaining == null) return false;
    const num = parseFloat(amount);
    return !Number.isNaN(num) && num > 0 && num > remaining;
  }, [amount, advanceLimit, remaining]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) {
      setError(t.advances.invalidAmount);
      return;
    }
    if (advanceLimit != null && approvedSum + num > advanceLimit) {
      setError(t.advances.limitExceeded);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.advances.failedRequest);
        return;
      }
      onRequested(data);
      setAmount('');
      setNote('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-ios-lg bg-white dark:bg-ios-dark-elevated p-4">
      {advanceLimit != null && (
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
          <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated-2 px-2.5 py-2">
            <p className="text-app-muted">{t.registerStaff.advanceLimit}</p>
            <p className="font-semibold text-app-primary">{advanceLimit.toFixed(2)} JOD</p>
          </div>
          <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated-2 px-2.5 py-2">
            <p className="text-app-muted">{t.status.approved}</p>
            <p className="font-semibold text-app-primary">{approvedSum.toFixed(2)} JOD</p>
          </div>
          <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated-2 px-2.5 py-2">
            <p className="text-app-muted">Remaining</p>
            <p className={`font-semibold ${(remaining ?? 0) > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
              {Math.max(0, remaining ?? 0).toFixed(2)} JOD
            </p>
          </div>
          <p className="sm:col-span-3 text-xs text-app-muted">
            {interpolate(t.advances.limitLabel, {
              limit: String(advanceLimit),
              used: String(approvedSum),
              remaining: String(Math.max(0, remaining ?? 0)),
            })}
          </p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-sm text-app-label mb-1">{t.advances.amountJod}</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="decimal"
              className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label ps-3 pe-14 py-2 text-right tabular-nums"
              placeholder="0.00"
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-app-muted">JOD</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm text-app-label mb-1">{t.advances.noteOptional}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            placeholder={t.advances.notePlaceholder}
            rows={2}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 w-full">{error}</p>}
      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={loading || wouldExceed}
          className="rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90 disabled:opacity-50"
        >
          {loading ? t.advances.submitting : t.advances.requestAdvance}
        </button>
      </div>
    </form>
  );
}
