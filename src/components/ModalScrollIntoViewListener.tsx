'use client';

import { useEffect } from 'react';
import { APP_MODAL_SELECTOR, isActiveAppModal, scrollModalIntoView } from '@/lib/modal-present';

function findModalInSubtree(node: Node): HTMLElement | null {
  if (node instanceof DocumentFragment) {
    for (const child of node.childNodes) {
      const found = findModalInSubtree(child);
      if (found) return found;
    }
    return null;
  }
  if (!(node instanceof HTMLElement)) return null;
  if (node.matches(APP_MODAL_SELECTOR)) return node;
  const inner = node.querySelector(APP_MODAL_SELECTOR);
  return inner instanceof HTMLElement ? inner : null;
}

/**
 * Global safety net: legacy dialogs without {@link AppModal} still scroll into view.
 * {@link AppModal} handles viewport lock + scroll itself via portal.
 */
export function ModalScrollIntoViewListener() {
  useEffect(() => {
    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type !== 'childList') continue;
        rec.addedNodes.forEach((node) => {
          const modal = findModalInSubtree(node);
          if (!modal || !isActiveAppModal(modal)) return;
          // AppModal already calls prepareModalViewport; only nudge position for others.
          if (!modal.hasAttribute('data-app-modal')) scrollModalIntoView(modal);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
