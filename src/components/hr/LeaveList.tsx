'use client';

import type { LeaveRequest } from '@prisma/client';
import type { Employee } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

export function LeaveList({ leaves }: { leaves: LeaveWithEmployee[] }) {
  const { t } = useLanguage();
  return (
    <ul className="divide-y divide-gray-200 dark:divide-ios-dark-separator rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-hidden">
      {leaves.length === 0 && <li className="p-4 text-app-muted text-sm">{t.leave.noLeaveRequests}</li>}
      {leaves.map((l) => {
        const typeLabel = l.type === 'sick' ? t.leave.typeSick : l.type === 'annual' ? t.leave.typeAnnual : t.leave.typeOther;
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return (
          <li key={l.id} className="p-4 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-app-primary">{start.toLocaleDateString()} - {end.toLocaleDateString()}</p>
              <span className="text-xs rounded-md px-2 py-0.5 bg-gray-100 dark:bg-ios-dark-elevated-2 text-app-secondary">{days} day(s)</span>
            </div>
            <p className="text-sm text-app-secondary">{typeLabel}</p>
            {l.note && <p className="text-sm text-app-secondary">{l.note}</p>}
            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
              l.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-amber-600 dark:text-white' :
              l.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-white' :
              'bg-red-100 text-red-800 dark:bg-red-600 dark:text-white'
            }`}>
              {t.status[l.status as keyof typeof t.status] ?? l.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
