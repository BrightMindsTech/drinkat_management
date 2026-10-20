import { isStaffLevelRole } from '@/lib/permissions';
import { normalizeUserRole } from '@/lib/formVisibility';

export type HomeTileLabelKey =
  | 'homeMyTasks'
  | 'homeHrNotes'
  | 'homeTeam'
  | 'homeMyKpi'
  | 'homeBroadcast'
  | 'homeSupport'
  | 'homePhotoReview'
  | 'homePhotoArchive'
  | 'homeQcReports';

export type HomeTile = { href: string; labelKey: HomeTileLabelKey };

const STAFF_TILES: HomeTile[] = [
  { href: '/dashboard/photo', labelKey: 'homeMyTasks' },
  { href: '/dashboard/kpi', labelKey: 'homeMyKpi' },
  { href: '/dashboard/broadcast', labelKey: 'homeBroadcast' },
  { href: '/dashboard/support', labelKey: 'homeSupport' },
];

const HR_TILES: HomeTile[] = [
  { href: '/dashboard/photo', labelKey: 'homeMyTasks' },
  { href: '/dashboard/hr-notes', labelKey: 'homeHrNotes' },
  { href: '/dashboard/hr', labelKey: 'homeTeam' },
  { href: '/dashboard/photo-archive', labelKey: 'homePhotoArchive' },
  { href: '/dashboard/kpi', labelKey: 'homeMyKpi' },
  { href: '/dashboard/broadcast', labelKey: 'homeBroadcast' },
  { href: '/dashboard/support', labelKey: 'homeSupport' },
];

const MANAGER_TILES: HomeTile[] = [
  { href: '/dashboard/photo', labelKey: 'homeMyTasks' },
  { href: '/dashboard/photo-review', labelKey: 'homePhotoReview' },
  { href: '/dashboard/kpi', labelKey: 'homeMyKpi' },
  { href: '/dashboard/qc-reports', labelKey: 'homeQcReports' },
  { href: '/dashboard/support', labelKey: 'homeSupport' },
];

/** Staff home plus QC sidebar destinations. Never includes HR Notes. */
const QC_TILES: HomeTile[] = [
  { href: '/dashboard/photo', labelKey: 'homeMyTasks' },
  { href: '/dashboard/photo-review', labelKey: 'homePhotoReview' },
  { href: '/dashboard/photo-archive', labelKey: 'homePhotoArchive' },
  { href: '/dashboard/kpi', labelKey: 'homeMyKpi' },
  { href: '/dashboard/qc-reports', labelKey: 'homeQcReports' },
  { href: '/dashboard/broadcast', labelKey: 'homeBroadcast' },
  { href: '/dashboard/support', labelKey: 'homeSupport' },
];

export function getDashboardHomeTiles(input: {
  role: string | undefined | null;
  hrKpiReviewer?: boolean;
  qcHome?: boolean;
}): HomeTile[] {
  const role = normalizeUserRole(input.role);
  const qcHome = Boolean(input.qcHome) || role === 'qc';
  const hr = Boolean(input.hrKpiReviewer);

  if (qcHome && !hr) return QC_TILES;
  if (hr && qcHome) {
    return [
      { href: '/dashboard/photo', labelKey: 'homeMyTasks' },
      { href: '/dashboard/hr-notes', labelKey: 'homeHrNotes' },
      { href: '/dashboard/hr', labelKey: 'homeTeam' },
      { href: '/dashboard/photo-review', labelKey: 'homePhotoReview' },
      { href: '/dashboard/photo-archive', labelKey: 'homePhotoArchive' },
      { href: '/dashboard/kpi', labelKey: 'homeMyKpi' },
      { href: '/dashboard/qc-reports', labelKey: 'homeQcReports' },
      { href: '/dashboard/broadcast', labelKey: 'homeBroadcast' },
      { href: '/dashboard/support', labelKey: 'homeSupport' },
    ];
  }
  if (hr) return HR_TILES;
  if (role === 'manager') return MANAGER_TILES;
  if (isStaffLevelRole(role)) return STAFF_TILES;
  return [];
}
