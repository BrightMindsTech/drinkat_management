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
 *
 * Library picks omit `capture` so iOS opens Photos instead of the camera.
 * Native source omits `capture` so iOS shows Take Photo / Photo Library.
 */
type ImagePickMode = 'camera' | 'library' | 'native';

function openImageFilePicker(mode: ImagePickMode, onFiles: (files: File[]) => void, multiple = false): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const prevScheme = html.style.getPropertyValue('color-scheme');
  const lightForCamera = mode !== 'library';
  if (lightForCamera) {
    html.style.setProperty('color-scheme', 'light');
    html.classList.add('camera-capture-active');
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (multiple) input.multiple = true;
  if (mode === 'camera') input.setAttribute('capture', 'environment');
  input.setAttribute('aria-hidden', 'true');
  input.tabIndex = -1;
  input.style.cssText =
    'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;margin:0;';
  document.body.appendChild(input);

  let finished = false;
  let finish: (files?: File[]) => void = () => {};
  const readFiles = () => (input.files ? Array.from(input.files) : []);
  const onFocus = () => {
    window.setTimeout(() => {
      if (!finished) finish(readFiles());
    }, 250);
  };
  const onBlur = () => {
    window.addEventListener('focus', onFocus, { once: true });
  };
  finish = (files?: File[]) => {
    if (finished) return;
    finished = true;
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
    input.remove();
    if (lightForCamera) {
      if (prevScheme) html.style.setProperty('color-scheme', prevScheme);
      else html.style.removeProperty('color-scheme');
      html.classList.remove('camera-capture-active');
    }
    if (files?.length) onFiles(files);
  };

  input.addEventListener('change', () => finish(readFiles()));
  input.addEventListener('cancel', () => finish());
  window.addEventListener('blur', onBlur, { once: true });
  window.setTimeout(() => {
    if (!finished) window.addEventListener('focus', onFocus, { once: true });
  }, 800);

  input.click();
}

export function openRearCameraCapture(onFile: (file: File) => void): void {
  openImageFilePicker('camera', (files) => {
    const file = files[0];
    if (file) onFile(file);
  });
}

export function openImageLibraryPick(onFiles: (files: File[]) => void): void {
  openImageFilePicker('library', onFiles, true);
}

/** One iPhone sheet: Take Photo or Photo Library. Multiple files when they pick from Photos. */
export function openNativeImageSourcePick(onFiles: (files: File[]) => void): void {
  openImageFilePicker('native', onFiles, true);
}
