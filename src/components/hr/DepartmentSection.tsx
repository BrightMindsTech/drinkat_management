'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Department } from '@prisma/client';

type DepartmentWithCount = Department & { _count?: { employees: number } };

export function DepartmentSection({
  initialDepartments,
  onDepartmentsChange,
}: {
  initialDepartments: Department[];
  onDepartmentsChange?: (departments: Department[]) => void;
}) {
  const { t } = useLanguage();
  const [departments, setDepartments] = useState<DepartmentWithCount[]>(initialDepartments);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => {
        setDepartments(data);
        onDepartmentsChange?.(data);
      })
      .catch(() => {});
  }, [onDepartmentsChange]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const next = [...departments, data];
        setDepartments(next);
        onDepartmentsChange?.(next);
        setNewName('');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = confirm(t.hr.deleteDepartmentConfirm.replace('{name}', name));
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert(t.hr.failedDeleteDepartment);
        return;
      }
      const next = departments.filter((d) => d.id !== id);
      setDepartments(next);
      onDepartmentsChange?.(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
      <h3 className="text-sm font-semibold text-app-primary mb-3">{t.hr.departments}</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t.hr.addDepartment}
          className="flex-1 min-w-0 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !newName.trim()}
          className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {t.common.create}
        </button>
      </form>
      <ul className="space-y-1 text-sm">
        {departments.map((d) => (
          <li key={d.id} className="flex justify-between items-center">
            <span>{d.name}</span>
            <div className="flex items-center gap-3">
              {d._count != null && <span className="text-app-muted">{d._count.employees} {t.reports.employees}</span>}
              <button
                type="button"
                onClick={() => handleDelete(d.id, d.name)}
                disabled={loading}
                className="text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {t.common.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
