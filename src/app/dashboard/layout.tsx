import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { DashboardNav } from '@/components/DashboardNav';
import { SignOutButton } from '@/components/SignOutButton';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PendingReviewNotice } from '@/components/PendingReviewNotice';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const navRole = normalizeUserRole(session.user.role);

  let headcountByBranch: { branchName: string; count: number }[] = [];
  if (navRole === 'owner') {
    const employees = await prisma.employee.findMany({
      where: { status: { not: 'terminated' } },
      select: { branchId: true },
    });
    const countsByBranchId = employees.reduce((acc, e) => {
      acc[e.branchId] = (acc[e.branchId] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const branchIds = Object.keys(countsByBranchId);
    const branches = await prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } });
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    headcountByBranch = Object.entries(countsByBranchId).map(([id, count]) => ({
      branchName: branchMap.get(id) ?? id,
      count,
    }));
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden min-w-0 w-full bg-ios-gray dark:bg-ios-gray-dark">
      <PendingReviewNotice role={navRole} />
      <header className="shrink-0 bg-white/80 dark:bg-ios-dark-elevated/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-ios-dark-separator/50 min-w-0 w-full pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl w-full min-w-0 mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 min-w-0">
            <Logo size={18} showPoweredBy={false} compact />
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <LanguageToggle />
            <ThemeToggle />
            <span className="text-sm text-app-muted truncate max-w-[120px] sm:max-w-[180px]" title={session.user.email ?? ''}>{session.user.email}</span>
            {navRole === 'owner' && headcountByBranch.length > 0 && (
              <span className="text-xs text-app-secondary" title={headcountByBranch.map((h) => `${h.branchName}: ${h.count}`).join(', ')}>
                {headcountByBranch.map((h) => `${h.branchName}: ${h.count}`).join(' | ')}
              </span>
            )}
            <span className="text-xs font-medium bg-gray-200 dark:bg-ios-dark-fill text-app-label px-2.5 py-1 rounded-full">{navRole}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden max-w-6xl w-full min-w-0 mx-auto px-4 py-6 app-animate-in">
        {children}
      </main>
      <div className="shrink-0 z-40 border-t border-gray-200/90 dark:border-ios-dark-separator/80 bg-white/95 dark:bg-ios-dark-elevated/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] min-w-0 w-full shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.25)]">
        <DashboardNav role={navRole} variant="bottom" />
      </div>
    </div>
  );
}
