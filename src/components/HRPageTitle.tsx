'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function HRPageTitle({ variant }: { variant: 'owner' | 'staff' }) {
  const { t } = useLanguage();
  const text = variant === 'owner' ? t.hr.title : t.hr.myInfoTitle;
  return <h1 className="text-2xl font-bold text-app-primary mb-6">{text}</h1>;
}
