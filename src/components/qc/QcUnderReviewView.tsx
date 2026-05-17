'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export function QcUnderReviewView() {
  const { t } = useLanguage();

  return (
    <div className="app-page max-w-lg mx-auto text-center space-y-4 py-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ios-blue/10 text-ios-blue dark:bg-ios-blue/20">
        <span className="text-2xl font-bold tabular-nums" aria-hidden>
          QC
        </span>
      </div>
      <h1 className="text-2xl font-semibold text-app-label">{t.qc.underReviewTitle}</h1>
      <p className="text-sm text-app-secondary leading-relaxed">{t.qc.underReviewBody}</p>
      <Link href="/dashboard" className="app-btn-primary inline-block mt-4">
        {t.qc.underReviewBack}
      </Link>
    </div>
  );
}
