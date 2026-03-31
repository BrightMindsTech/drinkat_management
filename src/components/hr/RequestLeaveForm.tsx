'use client';

import { useState } from 'react';
import type { LeaveRequest } from '@prisma/client';
import type { Employee } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

export function RequestLeaveForm({ onRequested }: { onRequested: (l: LeaveWithEmployee) => void }) {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'sick' | 'annual' | 'other'>('annual');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const leaveDays =
    startDate && endDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError(t.leave.selectDates);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, type, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.leave.failedRequest);
        return;
      }
      onRequested(data);
      setStartDate('');
      setEndDate('');
      setNote('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-ios-lg bg-white dark:bg-ios-dark-elevated p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm text-app-label mb-1">{t.leave.startDate}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              const next = e.target.value;
              setStartDate(next);
              if (endDate && next && endDate < next) setEndDate(next);
            }}
            required
            className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.leave.endDate}</label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.leave.type}</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'sick' | 'annual' | 'other')} className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2">
            <option value="sick">{t.leave.typeSick}</option>
            <option value="annual">{t.leave.typeAnnual}</option>
            <option value="other">{t.leave.typeOther}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.common.total}</label>
          <div className="h-[42px] rounded-ios border border-gray-200 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-dark-elevated-2 px-3 flex items-center text-sm font-medium text-app-primary">
            {leaveDays > 0 ? `${leaveDays} day(s)` : '—'}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-sm text-app-label mb-1">{t.leave.note}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          placeholder={t.advances.notePlaceholder}
        />
      </div>
      {error && <p className="text-sm text-red-600 w-full mt-2">{error}</p>}
      <button type="submit" disabled={loading} className="mt-3 rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90 disabled:opacity-50">
        {loading ? t.leave.submitting : t.leave.submit}
      </button>
    </form>
  );
}
