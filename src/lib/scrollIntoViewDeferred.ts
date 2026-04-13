/** Scroll after React has committed (next task / frame). */
export function scrollIntoViewById(elementId: string, options?: ScrollIntoViewOptions) {
  const opts: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start', ...options };
  window.setTimeout(() => {
    document.getElementById(elementId)?.scrollIntoView(opts);
  }, 0);
}
