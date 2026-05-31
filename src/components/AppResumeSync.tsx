'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { APP_RESUME_EVENT, bindAppResumeSync } from '@/lib/app-resume-sync';

/** Re-register push, refresh data, and reload server UI when the app returns from background. */
export function AppResumeSync() {
  const router = useRouter();

  useEffect(() => {
    const stop = bindAppResumeSync();
    const onResume = () => {
      router.refresh();
    };
    window.addEventListener(APP_RESUME_EVENT, onResume);
    return () => {
      stop();
      window.removeEventListener(APP_RESUME_EVENT, onResume);
    };
  }, [router]);

  return null;
}
