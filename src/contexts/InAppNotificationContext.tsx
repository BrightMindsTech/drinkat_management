'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type InAppNotificationEntry = {
  id: string;
  title: string;
  body?: string;
  /** No auto-dismiss timer (clock-in gate, pending review). */
  persistent?: boolean;
  minimizable?: boolean;
  minimizedLabel?: string;
  /** Defaults to 10_000 when not persistent. */
  autoDismissMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  /** Optional extra rows (pending item list, links). */
  content?: ReactNode;
};

type InAppNotificationContextValue = {
  entries: InAppNotificationEntry[];
  minimizedIds: Set<string>;
  dismissedIds: Set<string>;
  upsert: (entry: InAppNotificationEntry) => void;
  remove: (id: string) => void;
  dismiss: (id: string) => void;
  setMinimized: (id: string, minimized: boolean) => void;
};

const InAppNotificationContext = createContext<InAppNotificationContextValue | null>(null);

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<InAppNotificationEntry[]>([]);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const upsert = useCallback((entry: InAppNotificationEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [...prev, entry];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
    setDismissedIds((prev) => {
      if (!prev.has(entry.id)) return prev;
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setMinimizedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    remove(id);
  }, [remove]);

  const setMinimized = useCallback((id: string, minimized: boolean) => {
    setMinimizedIds((prev) => {
      const next = new Set(prev);
      if (minimized) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ entries, minimizedIds, dismissedIds, upsert, remove, dismiss, setMinimized }),
    [entries, minimizedIds, dismissedIds, upsert, remove, dismiss, setMinimized]
  );

  return <InAppNotificationContext.Provider value={value}>{children}</InAppNotificationContext.Provider>;
}

export function useInAppNotifications() {
  const ctx = useContext(InAppNotificationContext);
  if (!ctx) throw new Error('useInAppNotifications must be used within InAppNotificationProvider');
  return ctx;
}
