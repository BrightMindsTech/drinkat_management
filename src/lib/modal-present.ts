/** Scrollable dashboard main column (nested under fixed chrome). */
export const DASHBOARD_SCROLL_SELECTOR = '[data-dashboard-scroll]';

/**
 * Before showing a viewport-fixed modal: lock body scroll and scroll dashboard panes to top
 * so the overlay is visible (fixed inside transformed ancestors would otherwise clip/misplace).
 */
export function prepareModalViewport(behavior: ScrollBehavior = 'smooth'): () => void {
  if (typeof document === 'undefined') return () => {};

  const prevBody = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  document.querySelectorAll(DASHBOARD_SCROLL_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.scrollTo({ top: 0, behavior });
    }
  });

  return () => {
    document.body.style.overflow = prevBody;
  };
}
