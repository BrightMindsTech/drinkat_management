'use client';

import { useEffect } from 'react';
import { DashboardErrorRecovery } from '@/components/DashboardErrorRecovery';
import { reportClientVisibleError } from '@/lib/report-client-visible-error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientVisibleError({
      kind: 'global-ssr',
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-ios-gray dark:bg-ios-gray-dark antialiased">
        <DashboardErrorRecovery onRetry={reset} digest={error.digest} />
      </body>
    </html>
  );
}
