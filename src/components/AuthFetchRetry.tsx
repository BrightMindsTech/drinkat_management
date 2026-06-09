'use client';

import { useEffect } from 'react';
import { fetchWithAuthSessionRetry, isNextAuthClientPath } from '@/lib/auth-session-client';

/**
 * Retries NextAuth `/api/auth/*` fetches on transient "Load failed" (refresh abort, edge blip).
 * Must mount early — before SessionProvider children fire parallel session pings.
 */
export function AuthFetchRetry() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
      if (!isNextAuthClientPath(url)) {
        return originalFetch(input, init);
      }
      return fetchWithAuthSessionRetry(input, init, originalFetch);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
