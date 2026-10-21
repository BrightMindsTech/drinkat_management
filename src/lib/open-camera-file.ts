/**
 * Open the rear camera from a WKWebView without the iOS black-preview bug.
 *
 * iOS shows a native camera sheet for `<input capture="environment">`. That sheet
 * renders a black feed on many phones when:
 *  - the page is `color-scheme: dark`, or
 *  - the input lives inside a clipped/overflow modal overlay.
 * Works on one iPhone and fails on another (theme, iOS version, Pro ultra-wide).
 *
 * Keep color-scheme light until the sheet dismisses. Restore only then.
 */
export function openRearCameraCapture(onFile: (file: File) => void): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const prevScheme = html.style.getPropertyValue('color-scheme');
  html.style.setProperty('color-scheme', 'light');
  html.classList.add('camera-capture-active');

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.setAttribute('capture', 'environment');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0;';
  document.body.appendChild(input);

  let finished = false;
  let finish: (file?: File) => void = () => {};
  const onFocus = () => {
    window.setTimeout(() => {
      if (!finished) finish(input.files?.[0]);
    }, 250);
  };
  const onBlur = () => {
    window.addEventListener('focus', onFocus, { once: true });
  };
  finish = (file?: File) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
    input.remove();
    if (prevScheme) html.style.setProperty('color-scheme', prevScheme);
    else html.style.removeProperty('color-scheme');
    html.classList.remove('camera-capture-active');
    if (file) onFile(file);
  };

  input.addEventListener('change', () => finish(input.files?.[0]));
  input.addEventListener('cancel', () => finish());
  window.addEventListener('blur', onBlur, { once: true });
  window.setTimeout(() => {
    if (!finished) window.addEventListener('focus', onFocus, { once: true });
  }, 800);

  input.click();
}
