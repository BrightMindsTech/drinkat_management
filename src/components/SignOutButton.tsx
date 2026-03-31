'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SignOutButton() {
  const router = useRouter();
  const { t } = useLanguage();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // Explicit client navigation after session invalidation is more reliable.
      await signOut({ redirect: false });
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      aria-busy={signingOut}
      className="text-sm text-ios-blue font-medium active:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {signingOut ? t.common.signingOut : t.common.signOut}
    </button>
  );
}
