'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en, type LocaleMessages } from '@/locales/en';
import { ar } from '@/locales/ar';

const LOCALE_KEY = 'drinkat-locale';

export type Locale = 'en' | 'ar';

const messages: Record<Locale, LocaleMessages> = { en, ar };

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: LocaleMessages;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
  if (stored === 'en' || stored === 'ar') return stored;
  return 'en';
}

function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale};path=/;max-age=31536000`;
}

export function LanguageProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getInitialLocale();
    setLocaleState(stored);
    setLocaleCookie(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale, mounted]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    setLocaleCookie(newLocale);
  }, []);

  const value: LanguageContextValue = {
    locale,
    setLocale,
    t: messages[locale],
    dir: locale === 'ar' ? 'rtl' : 'ltr',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

/** Same as useLanguage but safe outside LanguageProvider (e.g. global-error boundary). */
export function useOptionalLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  const locale = getInitialLocale();
  return {
    locale,
    setLocale: () => {},
    t: messages[locale],
    dir: locale === 'ar' ? 'rtl' : 'ltr',
  };
}

/** Replace placeholders like {name} or {email} in a string */
export function interpolate(str: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
    str
  );
}
