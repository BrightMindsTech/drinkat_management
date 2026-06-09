const STORAGE_KEY = 'drinkat-dash-auto-retry';
const WINDOW_MS = 60_000;
export const DASH_AUTO_RETRY_MAX = 5;

type RetryState = { count: number; at: number };

function readState(): RetryState {
  if (typeof window === 'undefined') return { count: 0, at: 0 };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, at: 0 };
    const parsed = JSON.parse(raw) as RetryState;
    if (!Number.isFinite(parsed.count) || !Number.isFinite(parsed.at)) return { count: 0, at: 0 };
    if (Date.now() - parsed.at > WINDOW_MS) return { count: 0, at: 0 };
    return parsed;
  } catch {
    return { count: 0, at: 0 };
  }
}

function writeState(state: RetryState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearDashboardAutoRetry(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** How many automatic page reloads already fired in the last minute. */
export function dashboardAutoRetryCount(): number {
  return readState().count;
}

/** Returns the new count, or 0 when the cap is reached. */
export function bumpDashboardAutoRetry(): number {
  const state = readState();
  if (state.count >= DASH_AUTO_RETRY_MAX) return 0;
  const next = { count: state.count + 1, at: Date.now() };
  writeState(next);
  return next.count;
}

export function dashboardAutoRetryDelayMs(attempt: number): number {
  return Math.min(400 * 2 ** Math.max(0, attempt - 1), 4000);
}
