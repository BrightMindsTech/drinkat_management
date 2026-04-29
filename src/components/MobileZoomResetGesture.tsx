'use client';

import { useEffect } from 'react';

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_MOVE_PX = 28;

/**
 * iOS Safari/WKWebView can stay zoomed after focusing small inputs.
 * Double-tap anywhere to snap the viewport scale back to 1.
 */
export function MobileZoomResetGesture() {
  useEffect(() => {
    let lastTapAt = 0;
    let lastX = 0;
    let lastY = 0;
    let resetTimer: number | null = null;

    const resetViewportZoom = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale <= 1.01) return;

      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();

      const meta = document.querySelector('meta[name="viewport"]');
      if (!(meta instanceof HTMLMetaElement)) return;

      const original = meta.content || 'width=device-width,initial-scale=1';
      const withInitial = /initial-scale=/.test(original)
        ? original.replace(/initial-scale=[^,]+/g, 'initial-scale=1')
        : `${original},initial-scale=1`;
      const forced = /maximum-scale=/.test(withInitial)
        ? withInitial.replace(/maximum-scale=[^,]+/g, 'maximum-scale=1')
        : `${withInitial},maximum-scale=1`;

      meta.setAttribute('content', forced);
      if (resetTimer != null) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        meta.setAttribute('content', original);
      }, 140);
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const now = Date.now();
      const dt = now - lastTapAt;
      const dx = Math.abs(t.clientX - lastX);
      const dy = Math.abs(t.clientY - lastY);
      if (dt > 0 && dt <= DOUBLE_TAP_MS && dx <= DOUBLE_TAP_MAX_MOVE_PX && dy <= DOUBLE_TAP_MAX_MOVE_PX) {
        resetViewportZoom();
      }
      lastTapAt = now;
      lastX = t.clientX;
      lastY = t.clientY;
    };

    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchend', onTouchEnd);
      if (resetTimer != null) window.clearTimeout(resetTimer);
    };
  }, []);

  return null;
}

