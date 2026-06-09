import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';

/** Keys must exist on `LocaleMessages['nav']`. */
export type DashboardNavLabelKey =
  | 'home'
  | 'messages'
  | 'hr'
  | 'qc'
  | 'forms'
  | 'reports'
  | 'managerReports'
  | 'ratings'
  | 'myInfoAdvances'
  | 'qcSubmissions'
  | 'technicalSupport';

export type DashboardNavItem = { href: string; labelKey: DashboardNavLabelKey };

const base = '/dashboard';

const supportItem: DashboardNavItem = { href: `${base}/support`, labelKey: 'technicalSupport' };

const ownerItems: DashboardNavItem[] = [
  { href: base, labelKey: 'home' },
  { href: `${base}/messages`, labelKey: 'messages' },
  { href: `${base}/hr`, labelKey: 'hr' },
  { href: `${base}/qc`, labelKey: 'qc' },
  { href: `${base}/forms`, labelKey: 'forms' },
  { href: `${base}/reports`, labelKey: 'reports' },
  { href: `${base}/manager-reports`, labelKey: 'managerReports' },
  supportItem,
];

const staffItems: DashboardNavItem[] = [
  { href: base, labelKey: 'home' },
  { href: `${base}/ratings`, labelKey: 'ratings' },
  { href: `${base}/messages`, labelKey: 'messages' },
  { href: `${base}/hr`, labelKey: 'myInfoAdvances' },
  { href: `${base}/qc`, labelKey: 'qcSubmissions' },
  { href: `${base}/forms`, labelKey: 'forms' },
  supportItem,
];

const managerItems: DashboardNavItem[] = [
  { href: base, labelKey: 'home' },
  { href: `${base}/ratings`, labelKey: 'ratings' },
  { href: `${base}/messages`, labelKey: 'messages' },
  { href: `${base}/hr`, labelKey: 'hr' },
  { href: `${base}/qc`, labelKey: 'qc' },
  { href: `${base}/forms`, labelKey: 'forms' },
  supportItem,
];

const marketingItems: DashboardNavItem[] = [
  { href: base, labelKey: 'home' },
  { href: `${base}/ratings`, labelKey: 'ratings' },
  { href: `${base}/messages`, labelKey: 'messages' },
  { href: `${base}/hr`, labelKey: 'myInfoAdvances' },
  { href: `${base}/forms`, labelKey: 'forms' },
  supportItem,
];

export function getDashboardNavItems(role: string | undefined | null): DashboardNavItem[] {
  const r = normalizeUserRole(role);
  if (r === 'owner') return ownerItems;
  /** QC: same destinations as managers (HR, QC ops, etc.) while checklist APIs treat QC like owner for branch scope. */
  if (r === 'qc') return managerItems;
  if (r === 'manager') return managerItems;
  if (r === 'marketing') return marketingItems;
  return staffItems;
}

/** Nav destinations excluding the home route (for dashboard shortcut grid). */
export function getDashboardShortcutDestinations(role: string | undefined | null): DashboardNavItem[] {
  return getDashboardNavItems(role).filter((x) => x.href !== base);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === base) return pathname === base || pathname === `${base}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type { AppUserRole };
