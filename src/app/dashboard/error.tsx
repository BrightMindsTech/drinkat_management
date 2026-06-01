'use client';

import { useEffect } from 'react';
import { DashboardErrorRecovery } from '@/components/DashboardErrorRecovery';
import { reportClientVisibleError } from '@/lib/report-client-visible-error';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientVisibleError({
      kind: 'dashboard-ssr',
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return <DashboardErrorRecovery onRetry={reset} digest={error.digest} />;
}
