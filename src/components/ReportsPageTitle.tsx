'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function ReportsPageTitle() {
  const { t } = useLanguage();
  return <h1 className="text-2xl font-bold text-app-primary mb-6">{t.reports.title}</h1>;
}
