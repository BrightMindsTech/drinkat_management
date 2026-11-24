'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { AppModal } from '@/components/AppModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadCredentialedImage } from '@/lib/credentialed-image';

type ViewerState = { src: string; gallery: string[] };

const Ctx = createContext<{
  openPhoto: (src: string, gallery?: string[]) => void;
} | null>(null);

export function useUploadPhotoViewer() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      openPhoto: (src: string) => {
        if (typeof window === 'undefined' || !src) return;
        const wrap = document.createElement('div');
        wrap.setAttribute(
          'style',
          'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:16px'
        );
        const img = document.createElement('img');
        img.alt = '';
        img.setAttribute('style', 'max-width:100%;max-height:90vh;object-fit:contain');
        wrap.appendChild(img);
        void loadCredentialedImage(src).then((url) => {
          if (url) img.src = url;
        });
        wrap.addEventListener('click', () => wrap.remove());
        document.body.appendChild(wrap);
      },
    };
  }
  return ctx;
}

function useCredentialedSrc(src: string | null | undefined): string | null {
  const [out, setOut] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setOut(null);
    void loadCredentialedImage(src).then((url) => {
      if (!cancelled) setOut(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return out;
}

export function CredentialedUploadImg({
  src,
  alt = '',
  className,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: (e: MouseEvent<HTMLImageElement>) => void;
}) {
  const shown = useCredentialedSrc(src);
  if (!shown) {
    return <span className={`inline-block bg-gray-200 dark:bg-ios-dark-fill ${className ?? ''}`} aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shown}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

export function UploadPhotoViewerProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewerState | null>(null);

  const openPhoto = useCallback((src: string, gallery?: string[]) => {
    const list = (gallery?.length ? gallery : [src]).filter(Boolean);
    setView({ src, gallery: list.length ? list : [src] });
  }, []);

  const close = useCallback(() => setView(null), []);

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (!view.gallery.length) return;
      const i = view.gallery.indexOf(view.src);
      if (e.key === 'ArrowRight') {
        setView({ ...view, src: view.gallery[(i + 1) % view.gallery.length]! });
      }
      if (e.key === 'ArrowLeft') {
        setView({ ...view, src: view.gallery[(i - 1 + view.gallery.length) % view.gallery.length]! });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, close]);

  const value = useMemo(() => ({ openPhoto }), [openPhoto]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AppModal
        open={Boolean(view)}
        onClose={close}
        closeOnBackdrop
        aria-label={t.common.photo}
        overlayClassName="fixed inset-0 flex flex-col bg-black/95 overscroll-none"
        panelClassName="flex min-h-0 min-w-0 flex-1 flex-col"
        zIndexClass="z-[600]"
      >
        {view ? (
          <>
            <div className="flex shrink-0 justify-end px-3 py-3">
              <button
                type="button"
                onClick={close}
                className="rounded-ios bg-white/10 px-4 py-2 text-sm font-medium text-white"
              >
                {t.common.close}
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4" onClick={close}>
              <CredentialedUploadImg
                src={view.src}
                className="max-h-[min(85vh,100%)] max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </>
        ) : null}
      </AppModal>
    </Ctx.Provider>
  );
}

export function OpenUploadPhoto({
  src,
  gallery,
  className,
  alt = '',
}: {
  src: string;
  gallery?: string[];
  className?: string;
  alt?: string;
}) {
  const { openPhoto } = useUploadPhotoViewer();
  return (
    <button
      type="button"
      onClick={() => openPhoto(src, gallery)}
      className="block overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ios-blue"
    >
      <CredentialedUploadImg src={src} alt={alt} className={className} />
    </button>
  );
}

export function OpenUploadPhotoText({
  src,
  gallery,
  className,
  children,
}: {
  src: string;
  gallery?: string[];
  className?: string;
  children: ReactNode;
}) {
  const { openPhoto } = useUploadPhotoViewer();
  return (
    <button type="button" onClick={() => openPhoto(src, gallery)} className={className}>
      {children}
    </button>
  );
}
