'use client';

import { useEffect } from 'react';

/** Prefer `role="dialog"` (with `aria-modal` when applicable) or `<dialog open>`. Use `data-app-modal="true"` for bespoke overlays. */
const MODAL_SELECTOR = '[role="dialog"], dialog[open], [data-app-modal="true"]';

function findModalInSubtree(node: Node): HTMLElement | null {
  if (node instanceof DocumentFragment) {
    for (const child of node.childNodes) {
      const found = findModalInSubtree(child);
      if (found) return found;
    }
    return null;
  }
  if (!(node instanceof HTMLElement)) return null;
  if (node.matches(MODAL_SELECTOR)) return node;
  const inner = node.querySelector(MODAL_SELECTOR);
  return inner instanceof HTMLElement ? inner : null;
}

/**
 * Watches the document for newly mounted modal surfaces and scrolls them into view.
 * Covers `role="dialog"` (including `aria-modal`) and native `<dialog open>`.
 * Helps when the user is scrolled inside a nested scroll area (e.g. dashboard main).
 */
export function ModalScrollIntoViewListener() {
  useEffect(() => {
    let raf = 0;
    const pending = new Set<HTMLElement>();

    const flush = () => {
      raf = 0;
      for (const el of pending) {
        if (!el.isConnected) continue;
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      pending.clear();
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(flush);
      });
    };

    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type !== 'childList') continue;
        rec.addedNodes.forEach((node) => {
          const modal = findModalInSubtree(node);
          if (modal) pending.add(modal);
        });
      }
      if (pending.size) schedule();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
