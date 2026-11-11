const KEY = 'drinkat.pendingPushUrl';

export function rememberPendingPushUrl(url: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, url);
    localStorage.setItem(KEY, url);
  } catch {
    /* ignore quota */
  }
}

export function consumePendingPushUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (!url || !url.startsWith('/dashboard')) return null;
    if (url.startsWith('//')) return null;
    return url;
  } catch {
    return null;
  }
}
