'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function QCPageTitle({ variant }: { variant: 'review' | 'staff' }) {
  const { t } = useLanguage();
  const text = variant === 'review' ? t.qc.title : t.qc.submissionsTitle;
  return <h1 className="text-2xl font-bold text-app-primary mb-6">{text}</h1>;
}
