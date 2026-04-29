import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';

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
    return [
      { id: 'section-home-overview', labelRef: 'dashboard.title' },
      { id: 'section-home-apps', labelRef: 'dashboard.allTools' },
    ];
  }

  if (path.startsWith('/dashboard/forms')) {
    const out: PageSectionDef[] = [];
    if (role === 'owner') out.push({ id: 'section-forms-owner', labelRef: 'forms.manageFormsTitle' });
    if (role === 'manager') {
      out.push({ id: 'section-forms-manager-assign', labelRef: 'forms.assignTitle' });
    }
    if (role === 'staff' || role === 'qc' || role === 'marketing' || role === 'manager') {
      out.push({ id: 'section-forms-available', labelRef: 'forms.availableForms' });
    }
    if (role === 'staff' || role === 'qc' || role === 'marketing' || role === 'manager') {
      out.push({ id: 'section-forms-my-submissions', labelRef: 'forms.mySubmissions' });
    }
    if (role === 'owner' || role === 'manager') {
      out.push({ id: 'section-forms-review', labelRef: 'forms.reviewQueue' });
    }
    return out;
  }

  if (path.startsWith('/dashboard/hr')) {
    if (role === 'staff' || role === 'marketing') {
      return [
        { id: 'hr-staff-info', labelRef: 'hr.myInfoTitle' },
        { id: 'hr-staff-leave', labelRef: 'hr.myLeave' },
        { id: 'hr-staff-documents', labelRef: 'employeeCard.myDocuments' },
        { id: 'hr-staff-salary', labelRef: 'employeeCard.mySalaryHistory' },
        { id: 'hr-staff-reviews', labelRef: 'employeeCard.myReviews' },
        { id: 'hr-staff-advances', labelRef: 'hr.advances' },
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
        { id: 'hr-branch-geofence', labelRef: 'hr.branchGeofenceTitle' },
        { id: 'hr-owner-staff', labelRef: 'hr.staff' },
        { id: 'hr-owner-departments', labelRef: 'hr.departments' },
        { id: 'hr-owner-manager-assignments', labelRef: 'hr.assignToManager' },
        { id: 'hr-owner-leave', labelRef: 'hr.leaveRequests' },
        { id: 'hr-owner-advances', labelRef: 'hr.advances' },
        { id: 'hr-owner-salary', labelRef: 'salary.salary' },
      ];
    }
    return [];
  }

  if (path.startsWith('/dashboard/qc')) {
    if (role === 'staff') {
      return [
        { id: 'qc-staff-checklists', labelRef: 'qc.checklists' },
        { id: 'qc-staff-submissions', labelRef: 'qc.submissionsTitle' },
      ];
    }
    return [
      { id: 'qc-review-checklists', labelRef: 'qc.checklists' },
      { id: 'qc-review-assignments', labelRef: 'qc.assignments' },
      { id: 'qc-review-submissions', labelRef: 'qc.submissionsTitle' },
      { id: 'qc-review-archive', labelRef: 'qc.archiveTitle' },
    ];
  }

  if (path.startsWith('/dashboard/reports')) {
    // Reports already lists every section in-page; the bottom "On this page" bar duplicated
    // it and consumed too much space on small screens—omit the sticky footer here.
    return [];
  }

  if (path.startsWith('/dashboard/time-clock')) {
    const out: PageSectionDef[] = [{ id: 'section-tc-main', labelRef: 'timeClock.title' }];
    if (role === 'manager') {
      out.push({ id: 'section-tc-alerts', labelRef: 'timeClock.clockAlertsTitle' });
      out.push({ id: 'section-tc-logs', labelRef: 'timeClock.employeeLogsTitle' });
    }
    return out;
  }

  if (path.startsWith('/dashboard/messages')) {
    // Chat already has its own navigation/header patterns; the sticky bottom
    // "On this page" bar overlaps the composer on phones.
    return [];
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
      {
        id: 'section-mgr-rpt-cat-manager_time_clock_report',
        labelRef: 'managerReports.categoryTimeClock',
      },
    ];
  }

  return [];
}
