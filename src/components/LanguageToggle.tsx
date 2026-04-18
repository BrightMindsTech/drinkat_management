'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      className="inline-flex h-10 min-w-[2.75rem] items-center justify-center rounded-ios px-2.5 text-xs font-semibold tabular-nums text-app-secondary transition-colors hover:bg-gray-200 hover:text-app-primary dark:hover:bg-ios-dark-elevated-2"
      aria-label={locale === 'en' ? t.common.switchToArabic : t.common.switchToEnglish}
      dir="ltr"
    >
      {locale === 'en' ? 'عربي' : 'EN'}
    </button>
  );
}
