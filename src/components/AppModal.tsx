'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { prepareModalViewport } from '@/lib/modal-present';

export type AppModalProps = {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  /** Centered panel (card) classes. */
  panelClassName?: string;
  /** Full-screen backdrop + flex wrapper; z-index class included here or via `zIndexClass`. */
  overlayClassName?: string;
  zIndexClass?: string;
  closeOnBackdrop?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

const DEFAULT_OVERLAY =
  'fixed inset-0 flex items-center justify-center bg-black/60 p-4 overscroll-none';
const DEFAULT_PANEL =
  'w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated shadow-2xl';

/**
 * Standard modal: portal to document.body, lock scroll, scroll dashboard to top, center in viewport.
 * Use for every popup / dialog — do not use raw `fixed inset-0` inside scrollable page content.
 */
export function AppModal({
  open,
  onClose,
  children,
  panelClassName = DEFAULT_PANEL,
  overlayClassName = DEFAULT_OVERLAY,
  zIndexClass = 'z-[120]',
  closeOnBackdrop = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: AppModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const restore = prepareModalViewport('smooth');
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => {
      window.cancelAnimationFrame(id);
      restore();
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={`${overlayClassName} ${zIndexClass}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      data-app-modal="true"
      onClick={
        closeOnBackdrop && onClose
          ? (e) => {
              if (e.target === e.currentTarget) onClose();
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onClose) onClose();
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
