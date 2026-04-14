'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignOutButton } from '@/components/SignOutButton';
import { PendingReviewNotice } from '@/components/PendingReviewNotice';
import { DashboardNavLinks } from './DashboardNavLinks';
import { DashboardPageSectionNav } from './DashboardPageSectionNav';
import { DashboardScrollMain } from './DashboardScrollMain';

function SidebarAccountBlock({ email }: { email: string }) {
  return (
    <div className="shrink-0 space-y-3 border-t border-gray-200/90 bg-gray-50/90 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-ios-dark-separator dark:bg-ios-dark-elevated-2/50">
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

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-ios-gray dark:bg-ios-gray-dark md:flex-row">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <DashboardNavLinks role={role} layout="sidebar" />
        </div>
        <SidebarAccountBlock email={email} />
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PendingReviewNotice role={role} />

        <header className="shrink-0 border-b border-gray-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated/90">
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

        <DashboardScrollMain>{children}</DashboardScrollMain>

        <DashboardPageSectionNav role={role} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal aria-label="Navigation menu">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 start-0 flex h-full max-h-[100dvh] w-[min(100%,18rem)] max-w-[90vw] flex-col border-e border-gray-200 bg-white shadow-2xl dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-3 dark:border-ios-dark-separator">
              <Link href="/dashboard" onClick={() => setDrawerOpen(false)} className="min-w-0">
                <Logo size={18} showPoweredBy={false} compact />
              </Link>
              <button
                type="button"
                className="rounded-full p-2 text-app-muted hover:bg-gray-100 dark:hover:bg-ios-dark-fill"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <DashboardNavLinks role={role} layout="drawer" onNavigate={() => setDrawerOpen(false)} />
            </div>
            <SidebarAccountBlock email={email} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
