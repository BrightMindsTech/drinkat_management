'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function NoEmployeeMessage({ type }: { type: 'hr' | 'qc' }) {
  const { t } = useLanguage();
  const text = type === 'hr' ? t.hr.noEmployeeRecord : t.hr.noEmployeeRecordShort;
  return <p className="text-app-secondary">{text}</p>;
}
