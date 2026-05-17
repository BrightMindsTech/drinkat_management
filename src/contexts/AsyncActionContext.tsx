'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

type AsyncActionContextValue = {
  /** Run `fn` once; ignore overlapping calls for the same key (null = global). */
  run: (key: string | null, fn: () => Promise<void>) => Promise<void>;
  isBusy: (key?: string | null) => boolean;
};

const GLOBAL_KEY = '__global__';

const AsyncActionContext = createContext<AsyncActionContextValue | null>(null);

export function AsyncActionProvider({ children }: { children: ReactNode }) {
  const inFlightRef = useRef(new Set<string>());
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const run = useCallback(async (key: string | null, fn: () => Promise<void>) => {
    const lockKey = key ?? GLOBAL_KEY;
    if (inFlightRef.current.has(lockKey)) return;
    inFlightRef.current.add(lockKey);
    bump();
    try {
      await fn();
    } finally {
      inFlightRef.current.delete(lockKey);
      bump();
    }
  }, []);

  const isBusy = useCallback(
    (key?: string | null) => {
      if (key === undefined) {
        return inFlightRef.current.size > 0;
      }
      return inFlightRef.current.has(key ?? GLOBAL_KEY);
    },
    []
  );

  const value = useMemo(() => ({ run, isBusy }), [run, isBusy]);

  return <AsyncActionContext.Provider value={value}>{children}</AsyncActionContext.Provider>;
}

export function useGuardedAction() {
  const ctx = useContext(AsyncActionContext);
  if (!ctx) {
    throw new Error('useGuardedAction must be used within AsyncActionProvider');
  }
  return ctx;
}

/** Optional: use when a component may render outside the provider (should not happen in app). */
export function useGuardedActionOptional(): AsyncActionContextValue | null {
  return useContext(AsyncActionContext);
}
