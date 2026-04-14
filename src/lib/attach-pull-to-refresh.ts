const DEFAULT_RESIST = 0.42;
const DEFAULT_MAX = 112;
const DEFAULT_TRIGGER = 76;

/**
 * Pull-down-from-top (touch) → `onRefresh()`. Returns detach function.
 */
export function attachPullToRefresh(
  el: HTMLElement,
  onRefresh: () => void,
  opts?: {
    resist?: number;
    max?: number;
    trigger?: number;
    canRefresh?: () => boolean;
    onPullChange?: (px: number) => void;
  }
): () => void {
  const resist = opts?.resist ?? DEFAULT_RESIST;
  const max = opts?.max ?? DEFAULT_MAX;
  const trigger = opts?.trigger ?? DEFAULT_TRIGGER;
  const canRefresh = opts?.canRefresh ?? (() => true);
  const onPullChange = opts?.onPullChange;

  let touchStartY: number | null = null;
  let tracking = false;
  let pullPx = 0;

  const atTop = () => el.scrollTop <= 1;

  const onTouchStart = (e: TouchEvent) => {
    if (!canRefresh()) return;
    if (!atTop()) return;
    touchStartY = e.touches[0]?.clientY ?? null;
    if (touchStartY == null) return;
    tracking = true;
    pullPx = 0;
    onPullChange?.(0);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!tracking || touchStartY == null || !canRefresh()) return;
    const y = e.touches[0]?.clientY ?? 0;
    const dy = y - touchStartY;
    if (dy > 0 && atTop()) {
      pullPx = Math.min(dy * resist, max);
      onPullChange?.(pullPx);
      if (pullPx > 12) e.preventDefault();
    } else if (dy < -8) {
      tracking = false;
      pullPx = 0;
      onPullChange?.(0);
      touchStartY = null;
    }
  };

  const onTouchEnd = () => {
    if (!tracking) return;
    tracking = false;
    touchStartY = null;
    const p = pullPx;
    pullPx = 0;
    onPullChange?.(0);
    if (p >= trigger) onRefresh();
  };

  const onTouchCancel = () => {
    tracking = false;
    touchStartY = null;
    pullPx = 0;
    onPullChange?.(0);
  };

  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchCancel);

  return () => {
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchCancel);
  };
}

export { DEFAULT_RESIST, DEFAULT_MAX, DEFAULT_TRIGGER };
