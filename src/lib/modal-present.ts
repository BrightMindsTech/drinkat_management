import { useEffect, type RefObject } from 'react';

/** Scrollable dashboard main column (nested under fixed chrome). */
export const DASHBOARD_SCROLL_SELECTOR = '[data-dashboard-scroll]';

/** Matches {@link ModalScrollIntoViewListener} and {@link AppModal}. */
export const APP_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], [data-app-modal="true"]';

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

/** Clear body scroll lock when no modal is open (e.g. after client navigation). */
export function releaseStuckModalViewport(): void {
  if (typeof document === 'undefined') return;
  const hasOpenModal = document.querySelector(APP_MODAL_SELECTOR);
  if (!hasOpenModal) {
    document.body.style.overflow = '';
  }
}

/** True when the element is a visible, interactive modal (excludes closed mobile drawer backdrop). */
export function isActiveAppModal(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  if (el.classList.contains('pointer-events-none')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  return true;
}

/** Scroll modal overlay into view (used by global listener for legacy dialogs). */
export function scrollModalIntoView(modalEl: HTMLElement): void {
  if (!isActiveAppModal(modalEl)) return;
  window.requestAnimationFrame(() => {
    if (!modalEl.isConnected || !isActiveAppModal(modalEl)) return;
    modalEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  });
}

/**
 * For legacy inline dialogs being migrated: same viewport behavior as {@link AppModal}.
 * Prefer {@link AppModal} for new popups.
 */
export function useModalPresent(open: boolean, panelRef?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const restore = prepareModalViewport('smooth');
    const id = window.requestAnimationFrame(() => {
      panelRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => {
      window.cancelAnimationFrame(id);
      restore();
    };
  }, [open, panelRef]);
}
