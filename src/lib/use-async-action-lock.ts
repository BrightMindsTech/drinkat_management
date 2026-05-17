import { useCallback, useRef, useState } from 'react';

/**
 * Single-action lock with `busy` UI state. Prefer `useGuardedAction()` from AsyncActionContext
 * when you need named keys across multiple buttons in one screen.
 */
export function useSubmitLock() {
  const lock = useAsyncActionLock();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      return lock.run(async () => {
        setBusy(true);
        try {
          return await fn();
        } finally {
          setBusy(false);
        }
      });
    },
    [lock]
  );

  return { busy, run, isLocked: lock.isLocked };
}

/** Prevents overlapping async handlers (e.g. double-tap / button spam). */
export function useAsyncActionLock() {
  const inFlightRef = useRef(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    try {
      return await fn();
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const isLocked = useCallback(() => inFlightRef.current, []);

  return { run, isLocked };
}
