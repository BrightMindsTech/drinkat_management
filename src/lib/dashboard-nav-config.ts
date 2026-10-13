import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';

/** Keys must exist on `LocaleMessages['nav']`. */
export type DashboardNavLabelKey =
  | 'home'
  | 'teamAccess'
  | 'qc'
  | 'forms'
  | 'reports'
  | 'ratings'
  | 'qcSubmissions'
  | 'myTasks'
  | 'issues'
  | 'kpi'
  | 'qcOverview'
  | 'sopLibrary'
  | 'technicalSupport'
  | 'photoCheck'
  | 'photoReview'
  | 'photoOps'
  | 'qcReports'
  | 'photoArchive'
  | 'broadcast'
  | 'hrNotes';

export type DashboardNavItem = { href: string; labelKey: DashboardNavLabelKey };

export type DashboardNavFlags = {
  photoRequired?: boolean;
  photoOpsAdmin?: boolean;
  qcReportsInbox?: boolean;
  hrKpiReviewer?: boolean;
};

const base = '/dashboard';

const supportItem: DashboardNavItem = { href: `${base}/support`, labelKey: 'technicalSupport' };

export function getDashboardNavItems(
  role: string | undefined | null,
  flags: DashboardNavFlags = {}
): DashboardNavItem[] {
  const r = normalizeUserRole(role);
  const items: DashboardNavItem[] = [{ href: base, labelKey: 'home' }];

  if (r === 'owner') {
    items.push(
      { href: `${base}/photo-review`, labelKey: 'photoReview' },
      { href: `${base}/photo-archive`, labelKey: 'photoArchive' },
      { href: `${base}/photo-ops`, labelKey: 'photoOps' },
      { href: `${base}/qc-reports`, labelKey: 'qcReports' },
      { href: `${base}/hr`, labelKey: 'teamAccess' },
      { href: `${base}/kpi`, labelKey: 'kpi' },
      supportItem
    );
    return items;
  }

  if (r === 'qc') {
    items.push(
      { href: `${base}/photo-review`, labelKey: 'photoReview' },
      { href: `${base}/photo-archive`, labelKey: 'photoArchive' },
      { href: `${base}/qc-reports`, labelKey: 'qcReports' },
      { href: `${base}/kpi`, labelKey: 'kpi' },
      { href: `${base}/broadcast`, labelKey: 'broadcast' },
      supportItem
    );
    return items;
  }

  if (r === 'manager') {
    items.push(
      { href: `${base}/photo-review`, labelKey: 'photoReview' },
      { href: `${base}/qc-reports`, labelKey: 'qcReports' },
      { href: `${base}/kpi`, labelKey: 'kpi' },
      supportItem
    );
    return items;
  }

  if (r === 'marketing') {
    items.push(supportItem);
    return items;
  }

  if (flags.photoRequired) {
    items.push({ href: `${base}/photo`, labelKey: 'photoCheck' });
  }
  if (flags.photoOpsAdmin) {
    items.push({ href: `${base}/photo-ops`, labelKey: 'photoOps' });
  }
  if (flags.qcReportsInbox) {
    items.push({ href: `${base}/qc-reports`, labelKey: 'qcReports' });
  }
  if (r === 'assistant_manager') {
    items.push({ href: `${base}/issues`, labelKey: 'issues' });
  }
  if (flags.hrKpiReviewer) {
    items.push({ href: `${base}/hr`, labelKey: 'teamAccess' });
    items.push({ href: `${base}/hr-notes`, labelKey: 'hrNotes' });
    items.push({ href: `${base}/photo-archive`, labelKey: 'photoArchive' });
  }
  items.push(
    { href: `${base}/kpi`, labelKey: 'kpi' },
    { href: `${base}/broadcast`, labelKey: 'broadcast' },
    supportItem
  );
  return items;
}

export function getDashboardShortcutDestinations(
  role: string | undefined | null,
  flags: DashboardNavFlags = {}
): DashboardNavItem[] {
  return getDashboardNavItems(role, flags).filter((x) => x.href !== base);
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === base) return pathname === base || pathname === `${base}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type { AppUserRole };
