'use client';

import { useClientMounted } from '@/lib/use-client-mounted';

/**
 * Defers children until after hydration so event handlers attach reliably.
 * Use on dashboard shell when SSR/client text can still diverge (e.g. live clocks).
 */
export function ClientMountGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useClientMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
