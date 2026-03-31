'use client';

import Link from 'next/link';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';

export function DashboardHomeContent({ email, role }: { email: string; role: string }) {
  const { t } = useLanguage();
  const base = '/dashboard';

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-primary mb-1">{t.dashboard.title}</h1>
      <p className="text-sm text-app-secondary mb-8">
        {interpolate(t.dashboard.welcome, { email, role: role })}
      </p>
      <div className="space-y-3 app-stagger">
        <Link
          href="/dashboard/hr"
          className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated active:bg-gray-50 dark:active:bg-ios-dark-elevated-2 p-4 app-hover-lift app-press app-surface"
        >
          <h2 className="text-3xl font-bold text-app-primary">{t.dashboard.hrCard}</h2>
          <p className="mt-1 text-sm text-app-muted text-center">
            {role === 'owner' ? t.dashboard.hrDescOwner : t.dashboard.hrDescStaff}
          </p>
        </Link>
        <Link
          href="/dashboard/qc"
          className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated active:bg-gray-50 dark:active:bg-ios-dark-elevated-2 p-4 app-hover-lift app-press app-surface"
        >
          <h2 className="text-3xl font-bold text-app-primary">{t.dashboard.qcCard}</h2>
          <p className="mt-1 text-sm text-app-muted text-center">
            {role === 'staff' ? t.dashboard.qcDescSubmit : t.dashboard.qcDescReview}
          </p>
        </Link>
        <Link
          href="/dashboard/forms"
          className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated active:bg-gray-50 dark:active:bg-ios-dark-elevated-2 p-4 app-hover-lift app-press app-surface"
        >
          <h2 className="text-3xl font-bold text-app-primary">{t.dashboard.formsCard}</h2>
          <p className="mt-1 text-sm text-app-muted text-center">{t.dashboard.formsDesc}</p>
        </Link>
        {role === 'owner' && (
          <Link
            href="/dashboard/reports"
            className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated active:bg-gray-50 dark:active:bg-ios-dark-elevated-2 p-4 app-hover-lift app-press app-surface"
          >
            <h2 className="text-3xl font-bold text-app-primary">{t.dashboard.reportsCard}</h2>
            <p className="mt-1 text-sm text-app-muted text-center">
              {t.dashboard.reportsDesc}
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}
