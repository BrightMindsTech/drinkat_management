'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppModal } from '@/components/AppModal';
import { useLanguage } from '@/contexts/LanguageContext';

type ViewerState = { src: string; gallery: string[] };

const Ctx = createContext<{
  openPhoto: (src: string, gallery?: string[]) => void;
} | null>(null);

export function useUploadPhotoViewer() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      openPhoto: (src: string) => {
        if (typeof window !== 'undefined') window.location.assign(src);
      },
    };
  }
  return ctx;
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={view.src}
                alt=""
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={className} />
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
