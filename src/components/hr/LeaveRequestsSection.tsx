'use client';

import { useState } from 'react';
import type { LeaveRequest } from '@prisma/client';
import type { Employee } from '@prisma/client';
import type { Branch } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

export function LeaveRequestsSection({ initialLeaves, branches }: { initialLeaves: LeaveWithEmployee[]; branches: Branch[] }) {
  const { t } = useLanguage();
  const [leaves, setLeaves] = useState(initialLeaves);
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = leaves.filter((l) => {
    const matchBranch = !branchFilter || l.employee.branchId === branchFilter;
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchBranch && matchStatus;
  });

  async function handleApproveDeny(id: string, status: 'approved' | 'denied') {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) setLeaves((prev) => prev.map((l) => (l.id === id ? data : l)));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm min-w-[140px]">
          <option value="">{t.qc.allBranches}</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm min-w-[120px]">
          <option value="">{t.leave.allStatus}</option>
          <option value="pending">{t.status.pending}</option>
          <option value="approved">{t.status.approved}</option>
          <option value="denied">{t.status.denied}</option>
        </select>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator rounded-ios-lg bg-white dark:bg-ios-dark-elevated overflow-hidden">
        {filtered.length === 0 && <li className="p-4 text-app-muted text-sm">{t.leave.noLeaveRequests}</li>}
        {filtered.map((l) => {
          const typeLabel = l.type === 'sick' ? t.leave.typeSick : l.type === 'annual' ? t.leave.typeAnnual : t.leave.typeOther;
          return (
            <li key={l.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-app-primary">{l.employee.name}</span>
                <span className="text-app-muted text-sm ml-2">{l.employee.branch.name}</span>
                <p className="text-sm text-app-secondary">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()} — {typeLabel}{l.note ? ` — ${l.note}` : ''}</p>
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${
                  l.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-600 dark:text-white' :
                  l.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-white' :
                  'bg-red-100 text-red-800 dark:bg-red-600 dark:text-white'
                }`}>
                  {t.status[l.status as keyof typeof t.status] ?? l.status}
                </span>
              </div>
              {l.status === 'pending' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleApproveDeny(l.id, 'approved')} disabled={updatingId === l.id} className="rounded-ios bg-ios-blue text-white px-3 py-2 text-sm font-medium disabled:opacity-50">{t.common.approve}</button>
                  <button type="button" onClick={() => handleApproveDeny(l.id, 'denied')} disabled={updatingId === l.id} className="rounded bg-red-600 text-white px-3 py-1 text-sm disabled:opacity-50">{t.common.deny}</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
