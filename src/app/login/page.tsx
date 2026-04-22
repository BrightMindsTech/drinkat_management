'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';

function LoginForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(t.login.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] w-full min-w-0 flex items-center justify-center px-4 py-6 box-border bg-ios-gray dark:bg-ios-gray-dark safe-pt-top pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-sm min-w-0 rounded-ios-lg bg-white dark:bg-ios-dark-elevated shadow-sm dark:shadow-none p-8">
        <div className="flex justify-end gap-2 mb-2">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <div className="flex flex-col items-center mb-8">
          <Logo size={24} showPoweredBy={true} subtitle={t.login.subtitle} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-app-label mb-1">{t.login.email}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill text-app-primary placeholder:text-app-muted px-4 py-3 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20"
              placeholder={t.login.emailPlaceholder}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-app-label mb-1">{t.login.password}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill text-app-primary px-4 py-3 focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20"
            />
          </div>
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-ios bg-ios-blue text-white py-3 font-medium active:opacity-90 disabled:opacity-50"
          >
            {loading ? t.login.signingIn : t.login.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}

function LoginFallback() {
  const { t } = useLanguage();
  return <div className="min-h-screen flex items-center justify-center bg-ios-gray dark:bg-ios-gray-dark text-app-primary">{t.common.loading}</div>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
