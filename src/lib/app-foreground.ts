'use client';

/** True when the DrinkatHR UI is visible (not backgrounded / app switcher). */
export function isAppForeground(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/** Run `cb` when the app returns to the foreground (includes Capacitor resume). */
export function bindAppForeground(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const run = () => {
    if (isAppForeground()) callback();
  };

  document.addEventListener('visibilitychange', run);
  window.addEventListener('focus', run);
  window.addEventListener('pageshow', run);

  return () => {
    document.removeEventListener('visibilitychange', run);
    window.removeEventListener('focus', run);
    window.removeEventListener('pageshow', run);
  };
}

/**
 * Like setInterval but skips work while the app is in the background.
 * Reduces CPU/memory pressure so iOS is less likely to terminate the WebView.
 */
export function setForegroundInterval(fn: () => void, ms: number): () => void {
  if (typeof window === 'undefined') return () => {};
  const id = window.setInterval(() => {
    if (!isAppForeground()) return;
    fn();
  }, ms);
  return () => window.clearInterval(id);
}
