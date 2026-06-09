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
  /** Insert already minimized (persistent alerts should not blanket the page on load). */
  startMinimized?: boolean;
  /** Defaults to 10_000 when not persistent. */
  autoDismissMs?: number;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  /** Optional extra rows (pending item list, links). */
  content?: ReactNode;
  /** Called when the user dismisses or hides this entry (session ack for pending-review sync). */
  onDismissed?: () => void;
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

function entryContentKey(entry: InAppNotificationEntry): string {
  return [
    entry.title,
    entry.body ?? '',
    entry.persistent ? '1' : '0',
    entry.minimizable ? '1' : '0',
    entry.minimizedLabel ?? '',
    entry.startMinimized ? '1' : '0',
    entry.autoDismissMs ?? '',
    entry.actionLabel ?? '',
    entry.href ?? '',
  ].join('\0');
}

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<InAppNotificationEntry[]>([]);
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const upsert = useCallback((entry: InAppNotificationEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx !== -1 && entryContentKey(prev[idx]!) === entryContentKey(entry)) {
        return prev;
      }
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
    if (entry.startMinimized) {
      setMinimizedIds((prev) => {
        if (prev.has(entry.id)) return prev;
        const next = new Set(prev);
        next.add(entry.id);
        return next;
      });
    }
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
      if (minimized ? prev.has(id) : !prev.has(id)) return prev;
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
