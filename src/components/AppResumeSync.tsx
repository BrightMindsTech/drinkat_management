'use client';

import { useCallback, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bindAppResumeSync } from '@/lib/app-resume-sync';

/** Wires real resume work (session, push, refresh) on app open and foreground. */
export function AppResumeSync() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refreshServerUi = useCallback(() => {
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    return bindAppResumeSync(refreshServerUi);
  }, [refreshServerUi]);

  return null;
}
