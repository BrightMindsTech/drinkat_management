'use client';

import { useEffect } from 'react';
import { bindAppResumeSync } from '@/lib/app-resume-sync';

/** Mount once in dashboard: re-register push + wake polling when app resumes. */
export function AppResumeSync() {
  useEffect(() => bindAppResumeSync(), []);
  return null;
}
