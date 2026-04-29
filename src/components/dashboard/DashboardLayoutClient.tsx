'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/components/SignOutButton';
import { PendingReviewNotice } from '@/components/PendingReviewNotice';
import { registerIosPushWithBackend } from '@/lib/native-push-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardNavLinks } from './DashboardNavLinks';
import { DashboardPageSectionNav } from './DashboardPageSectionNav';
import { DashboardScrollMain } from './DashboardScrollMain';
import { usePathname, useRouter } from 'next/navigation';

function SidebarAccountBlock({ email, bottomSafeArea = true }: { email: string; bottomSafeArea?: boolean }) {
  return (
    <div
      className={`shrink-0 space-y-3 border-t border-gray-200/90 bg-gray-50/90 px-3 py-3 dark:border-ios-dark-separator dark:bg-ios-dark-elevated-2/50 ${
        bottomSafeArea ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'pb-3'
      }`}
    >
      <p className="break-words text-xs leading-snug text-app-secondary" title={email}>
        {email}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageToggle />
        <SignOutButton />
      </div>
    </div>
  );
}

export function DashboardLayoutClient({
  role,
  email,
  headcountSummary,
  children,
}: {
  role: string;
  email: string;
  headcountSummary: string | null;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeActiveRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { dir } = useLanguage();

  useEffect(() => {
    if (!drawerOpen) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    let stopped = false;
    let timerId: number | null = null;
    let inLoop = false;
    async function attemptRegister() {
      if (stopped || inLoop) return;
      inLoop = true;
      const ok = await registerIosPushWithBackend();
      inLoop = false;
      if (ok || stopped) return;
      timerId = window.setTimeout(() => {
        void attemptRegister();
      }, 5000);
    }
    void attemptRegister();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void attemptRegister();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopped = true;
      if (timerId != null) window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refreshChatUnreadCount() {
      try {
        const res = await fetch('/api/chat/threads', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as { threads?: { unreadCount?: number }[] };
        if (cancelled) return;
        const total = (data.threads ?? []).reduce((sum, th) => sum + (th.unreadCount ?? 0), 0);
        setChatUnreadCount(total);
      } catch {
        // optional UI enhancement; keep silent on fetch failures
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshChatUnreadCount();
    };

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshChatUnreadCount();
    }, 5000);

    document.addEventListener('visibilitychange', onVisibility);
    void refreshChatUnreadCount();
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const menuOpenDirection = dir === 'rtl' ? -1 : 1;
  const menuEdge = dir === 'rtl' ? 'right' : 'left';
  const path = pathname ?? '';
  const isDashboardHome = path === '/dashboard';
  const isMessagesPage = path.startsWith('/dashboard/messages');

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    if (!t) return;
    swipeStartXRef.current = t.clientX;
    swipeStartYRef.current = t.clientY;
    swipeActiveRef.current = true;
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (!swipeActiveRef.current) return;
    swipeActiveRef.current = false;
    const startX = swipeStartXRef.current;
    const startY = swipeStartYRef.current;
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    const t = e.changedTouches[0];
    if (!t || startX == null || startY == null) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const width = window.innerWidth || 390;
    const edgeThreshold = Math.min(28, width * 0.08);
    const startsAtMenuEdge = menuEdge === 'left' ? startX <= edgeThreshold : startX >= width - edgeThreshold;
    const startsAtBackEdge = startsAtMenuEdge;
    const opensMenu = dx * menuOpenDirection > 90;
    const closesMenu = dx * menuOpenDirection < -70;
    const goesBack = dx * menuOpenDirection > 90;

    if (absDx < 60 || absDx < absDy * 1.3) return;

    if (drawerOpen && closesMenu) {
      setDrawerOpen(false);
      return;
    }

    if (!drawerOpen && startsAtMenuEdge && opensMenu && isDashboardHome) {
      setDrawerOpen(true);
      return;
    }

    if (!drawerOpen && startsAtBackEdge && goesBack && !isDashboardHome) {
      router.back();
    }
  }

  return (
    <div
      className="flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-ios-gray dark:bg-ios-gray-dark md:flex-row"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden min-h-0 w-[min(100%,15.5rem)] shrink-0 flex-col border-e border-gray-200/90 bg-white/95 dark:border-ios-dark-separator dark:bg-ios-dark-elevated/95 md:flex"
        aria-label="Main navigation"
      >
        <div className="shrink-0 border-b border-gray-200/80 px-3 py-3 dark:border-ios-dark-separator">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <Logo size={18} showPoweredBy={false} compact />
          </Link>
        </div>
        <div className="min-w-0 shrink-0 overflow-hidden">
          <DashboardNavLinks role={role} layout="sidebar" />
        </div>
        <SidebarAccountBlock email={email} />
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overscroll-none">
        <PendingReviewNotice role={role} />
        {/* touch-none: drags on chrome must not scroll the main column / webview (iOS scroll chaining) */}
        {/* bg matches header through safe-area inset so there’s no gray “empty” strip under the status bar */}
        <div className="safe-pt-top shrink-0 touch-none border-b border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated/90">
          <header className="min-w-0">
            <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-app-primary md:hidden dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
              <Logo size={18} showPoweredBy={false} compact />
            </Link>
            <div className="ms-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <ThemeToggle />
              <LanguageToggle />
              {headcountSummary ? (
                <span
                  className="hidden max-w-[140px] truncate text-[11px] text-app-secondary lg:inline xl:max-w-[220px]"
                  title={headcountSummary}
                >
                  {headcountSummary}
                </span>
              ) : null}
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-label dark:bg-ios-dark-fill">
                {role}
              </span>
            </div>
            </div>
          </header>
        </div>

        {isMessagesPage ? (
          <main className="app-animate-in mx-auto flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col overflow-hidden">
            {children}
          </main>
        ) : (
          <DashboardScrollMain>{children}</DashboardScrollMain>
        )}

        {!isMessagesPage ? <DashboardPageSectionNav role={role} /> : null}
      </div>

      {!isMessagesPage ? (
        <Link
          href="/dashboard/messages"
          className="fixed bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-4 z-[120] inline-flex h-14 w-14 items-center justify-center rounded-full bg-ios-blue text-white shadow-xl ring-2 ring-white/70 transition hover:scale-[1.03] active:scale-95 dark:ring-ios-dark-elevated"
          aria-label="Open messages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {chatUnreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] rounded-full bg-red-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white shadow">
              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
            </span>
          ) : null}
        </Link>
      ) : null}

      {/* Mobile drawer: viewport-fixed panel (not nested absolute) + shell safe-area padding = full-bleed bg, no black letterboxing */}
      <div
        className={`fixed inset-0 z-[125] overscroll-none md:hidden ${drawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        role="dialog"
        aria-modal
        aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ease-out ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Close menu"
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
        />
      </div>
      <div
        className={`drawer-touch-lock fixed top-0 bottom-0 start-0 z-[130] flex w-[min(100%,18rem)] max-w-[90vw] flex-col overflow-hidden overscroll-none border-e border-gray-200 bg-white pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] shadow-2xl will-change-transform dark:border-ios-dark-separator dark:bg-ios-dark-elevated motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out md:hidden ${
          drawerOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full rtl:translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!drawerOpen}
      >
        <div className="shrink-0 border-b border-gray-100 bg-white px-3 dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
          <div className="flex items-center justify-between py-3">
            <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="min-w-0">
              <Logo size={18} showPoweredBy={false} compact />
            </Link>
            <button
              type="button"
              className="rounded-full p-2 text-app-muted hover:bg-gray-100 dark:hover:bg-ios-dark-fill"
              aria-label="Close"
              tabIndex={drawerOpen ? 0 : -1}
              onClick={() => setDrawerOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="min-w-0 shrink-0 overflow-hidden">
          <DashboardNavLinks role={role} layout="drawer" onNavigate={() => setDrawerOpen(false)} />
        </div>
        <SidebarAccountBlock email={email} bottomSafeArea={false} />
      </div>
    </div>
  );
}
