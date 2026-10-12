import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';
import { isStaffLevelRole } from '@/lib/permissions';

export type PageSectionDef = {
  id: string;
  /** Dot path on `LocaleMessages` (e.g. `forms.reviewQueue`). */
  labelRef: string;
  /** Omit = all roles that can open this route. */
  roles?: readonly AppUserRole[];
};

function normPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function getPageSections(pathname: string, roleRaw: string | undefined | null): PageSectionDef[] {
  const path = normPath(pathname);
  const role = normalizeUserRole(roleRaw);

  if (path === '/dashboard') {
    if (isStaffLevelRole(role) || role === 'qc') {
      return [{ id: 'section-home-apps', labelRef: 'dashboard.allTools' }];
    }
    return [{ id: 'section-home-overview', labelRef: 'dashboard.title' }];
  }

  if (path === '/dashboard/photo' || path === '/dashboard/photo-review') {
    return [{ id: 'section-home-overview', labelRef: 'dashboard.title' }];
  }
  if (path.startsWith('/dashboard/photo-ops')) {
    return [{ id: 'section-photo-ops', labelRef: 'nav.photoOps' }];
  }
  if (path.startsWith('/dashboard/qc-reports')) {
    return [{ id: 'section-qc-reports', labelRef: 'nav.qcReports' }];
  }
  if (path.startsWith('/dashboard/notes') || path.startsWith('/dashboard/broadcast')) {
    return [{ id: 'section-notes', labelRef: 'nav.broadcast' }];
  }
  if (path.startsWith('/dashboard/hr-notes')) {
    return [{ id: 'section-hr-notes', labelRef: 'nav.hrNotes' }];
  }

  if (path.startsWith('/dashboard/forms')) {
    const out: PageSectionDef[] = [];
    if (role === 'owner') out.push({ id: 'section-forms-owner', labelRef: 'forms.manageFormsTitle' });
    if (role === 'manager') {
      out.push({ id: 'section-forms-manager-assign', labelRef: 'forms.assignTitle' });
    }
    if (isStaffLevelRole(role) || role === 'qc' || role === 'marketing' || role === 'manager') {
      out.push({ id: 'section-forms-available', labelRef: 'forms.availableForms' });
    }
    if (isStaffLevelRole(role) || role === 'qc' || role === 'marketing' || role === 'manager') {
      out.push({ id: 'section-forms-my-submissions', labelRef: 'forms.mySubmissions' });
    }
    if (role === 'owner' || role === 'manager' || role === 'qc') {
      out.push({ id: 'section-forms-review', labelRef: 'forms.reviewQueue' });
    }
    return out;
  }

  if (path.startsWith('/dashboard/hr')) {
    if (isStaffLevelRole(role) || role === 'marketing' || role === 'qc') {
      return [
        { id: 'hr-owner-staff', labelRef: 'hr.staff' },
        { id: 'hr-owner-departments', labelRef: 'hr.departments' },
        { id: 'hr-owner-manager-assignments', labelRef: 'hr.assignToManager' },
      ];
    }
    if (role === 'manager') {
      return [
        { id: 'hr-manager-info', labelRef: 'hr.myInformation' },
        { id: 'hr-manager-my-advances', labelRef: 'hr.myAdvanceRequests' },
        { id: 'hr-owner-leave', labelRef: 'hr.leaveRequests' },
        { id: 'hr-manager-team', labelRef: 'hr.staff' },
        { id: 'hr-owner-advances', labelRef: 'hr.teamAdvanceRequests' },
      ];
    }
    if (role === 'owner') {
      return [
        { id: 'hr-owner-push-broadcast', labelRef: 'hr.pushBroadcastTitle' },
        { id: 'hr-owner-staff', labelRef: 'hr.staff' },
        { id: 'hr-owner-departments', labelRef: 'hr.departments' },
        { id: 'hr-owner-manager-assignments', labelRef: 'hr.assignToManager' },
        { id: 'hr-owner-export', labelRef: 'hr.historicalExport' },
      ];
    }
    return [];
  }

  if (path.startsWith('/dashboard/qc')) {
    if (isStaffLevelRole(role)) {
      return [
        { id: 'qc-staff-checklists', labelRef: 'qc.checklists' },
        { id: 'qc-staff-submissions', labelRef: 'qc.submissionsTitle' },
      ];
    }
    return [
      { id: 'qc-review-checklists', labelRef: 'qc.checklists' },
      { id: 'qc-review-submissions', labelRef: 'qc.submissionsToReview' },
      { id: 'qc-review-assignments', labelRef: 'qc.assignments' },
      { id: 'qc-review-archive', labelRef: 'qc.archiveTitle' },
    ];
  }

  if (path.startsWith('/dashboard/reports')) {
    // Reports already lists every section in-page; the bottom "On this page" bar duplicated
    // it and consumed too much space on small screens—omit the sticky footer here.
    return [];
  }

  if (path.startsWith('/dashboard/messages')) {
    // Chat already has its own navigation/header patterns; the sticky bottom
    // "On this page" bar overlaps the composer on phones.
    return [];
  }

  if (path.startsWith('/dashboard/tasks')) {
    return [{ id: 'section-tasks-today', labelRef: 'qcOps.myTasksTitle' }];
  }
  if (path.startsWith('/dashboard/issues')) {
    return [{ id: 'section-issues', labelRef: 'qcOps.issuesTitle' }];
  }
  if (path.startsWith('/dashboard/kpi')) {
    return [{ id: 'section-kpi', labelRef: 'qcOps.kpiTitle' }];
  }
  if (path.startsWith('/dashboard/ai')) {
    return [{ id: 'section-ai', labelRef: 'qcOps.aiTitle' }];
  }
  if (path.startsWith('/dashboard/qc-overview')) {
    return [{ id: 'section-overview', labelRef: 'qcOps.overviewTitle' }];
  }
  if (path.startsWith('/dashboard/sop')) {
    return [{ id: 'section-sop-drafts', labelRef: 'qcOps.sopDraftsTitle', roles: ['owner', 'qc'] }];
  }

  if (path.startsWith('/dashboard/ratings')) {
    return [{ id: 'section-ratings-main', labelRef: 'ratings.pageTitle' }];
  }

  if (path.startsWith('/dashboard/manager-reports')) {
    return [
      { id: 'section-manager-reports-filters', labelRef: 'managerReports.filter' },
      {
        id: 'section-mgr-rpt-cat-weekly_rating_submitted',
        labelRef: 'managerReports.categoryWeeklyRating',
      },
      { id: 'section-mgr-rpt-cat-manager_form_report', labelRef: 'managerReports.categoryForm' },
    ];
  }

  return [];
}
