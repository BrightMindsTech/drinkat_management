'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/components/SignOutButton';
import { PushConnectionNotice } from '@/components/PushConnectionNotice';
import { PendingReviewNotice } from '@/components/PendingReviewNotice';
import { WeeklyRatingNotice } from '@/components/WeeklyRatingNotice';
import { InAppNotificationStack } from '@/components/in-app/InAppNotificationStack';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardNavLinks } from './DashboardNavLinks';
import { DashboardPageSectionNav } from './DashboardPageSectionNav';
import { DashboardScrollMain } from './DashboardScrollMain';
import { DashboardSearchOverlay } from './DashboardSearchOverlay';
import { usePathname } from 'next/navigation';
import { clearDashboardAutoRetry } from '@/lib/dashboard-auto-retry';
import { releaseStuckModalViewport } from '@/lib/modal-present';

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
  photoRequired = false,
  photoOpsAdmin = false,
  qcReportsInbox = false,
  hrKpiReviewer = false,
  children,
}: {
  role: string;
  email: string;
  headcountSummary: string | null;
  photoRequired?: boolean;
  photoOpsAdmin?: boolean;
  qcReportsInbox?: boolean;
  hrKpiReviewer?: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeActiveRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const { dir } = useLanguage();

  useEffect(() => {
    clearDashboardAutoRetry();
    releaseStuckModalViewport();
    setSearchOpen(false);
  }, [pathname]);

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

  const navFlags = { photoRequired, photoOpsAdmin, qcReportsInbox, hrKpiReviewer };
  const menuOpenDirection = dir === 'rtl' ? -1 : 1;
  const menuEdge = dir === 'rtl' ? 'right' : 'left';
  const path = pathname ?? '';
  const isMessagesPage = path.startsWith('/dashboard/messages');
  const drawerOpenRef = useRef(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    function isDesktop() {
      return window.matchMedia('(min-width: 768px)').matches;
    }

    function edgePx() {
      return Math.max(36, Math.min(48, (window.innerWidth || 390) * 0.12));
    }

    function atMenuEdge(x: number) {
      const width = window.innerWidth || 390;
      return menuEdge === 'left' ? x <= edgePx() : x >= width - edgePx();
    }

    function isInteractiveTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest('button, a, input, textarea, select, label, [role="button"], [role="link"]')
      );
    }

    function onStart(e: TouchEvent) {
      if (isDesktop()) return;
      const t = e.touches[0];
      if (!t) return;
      if (isInteractiveTarget(e.target)) {
        swipeActiveRef.current = false;
        swipeStartXRef.current = null;
        swipeStartYRef.current = null;
        return;
      }
      swipeStartXRef.current = t.clientX;
      swipeStartYRef.current = t.clientY;
      swipeActiveRef.current = true;
    }

    function onMove(e: TouchEvent) {
      if (!swipeActiveRef.current) return;
      const startX = swipeStartXRef.current;
      const startY = swipeStartYRef.current;
      const t = e.touches[0];
      if (!t || startX == null || startY == null) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (atMenuEdge(startX) && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
      }
    }

    function onEnd(e: TouchEvent) {
      if (!swipeActiveRef.current) return;
      swipeActiveRef.current = false;
      const startX = swipeStartXRef.current;
      const startY = swipeStartYRef.current;
      swipeStartXRef.current = null;
      swipeStartYRef.current = null;
      const t = e.changedTouches[0];
      if (isDesktop() || !t || startX == null || startY == null) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 48 || absDx < absDy * 1.2) return;

      const opensMenu = dx * menuOpenDirection > 48;
      const closesMenu = dx * menuOpenDirection < -48;

      if (drawerOpenRef.current && closesMenu) {
        setDrawerOpen(false);
        return;
      }
      if (!drawerOpenRef.current && atMenuEdge(startX) && opensMenu) {
        setDrawerOpen(true);
      }
    }

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [dir, menuEdge, menuOpenDirection]);

  return (
    <div
      ref={shellRef}
      className="flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-ios-gray dark:bg-ios-gray-dark md:flex-row"
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
          <DashboardNavLinks role={role} flags={navFlags} layout="sidebar" />
        </div>
        <SidebarAccountBlock email={email} />
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overscroll-none">
        <PendingReviewNotice role={role} />
        <WeeklyRatingNotice role={role} />
        <InAppNotificationStack />
        {/* touch-none: drags on chrome must not scroll the main column / webview (iOS scroll chaining) */}
        {/* safe-pt-top once for push banner + header — banner was above this and hid under the notch */}
        <div className="safe-pt-top shrink-0 touch-none border-b border-gray-200/80 bg-white/90 backdrop-blur-xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated/90">
          <PushConnectionNotice />
          <header className="min-w-0">
            <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <button
              type="button"
              id="dashboard-open-menu"
              className="relative z-[20] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-app-primary md:hidden dark:border-ios-dark-separator dark:bg-ios-dark-fill"
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
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-app-primary dark:border-ios-dark-separator dark:bg-ios-dark-fill"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
              </button>
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
          <DashboardNavLinks role={role} flags={navFlags} layout="drawer" onNavigate={() => setDrawerOpen(false)} />
        </div>
        <SidebarAccountBlock email={email} bottomSafeArea={false} />
      </div>

      <DashboardSearchOverlay role={role} flags={navFlags} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
