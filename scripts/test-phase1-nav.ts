import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { getDashboardNavItems } from '../src/lib/dashboard-nav-config';
import { getDashboardHomeTiles } from '../src/lib/dashboard-home-tiles';

function hrefs(role: string, flags?: Parameters<typeof getDashboardNavItems>[1]) {
  return getDashboardNavItems(role, flags).map((i) => i.href).sort();
}

assert(!hrefs('staff').includes('/dashboard/issues'));
assert(hrefs('assistant_manager').includes('/dashboard/issues'));
assert(!hrefs('staff').includes('/dashboard/photo'));
assert(hrefs('staff', { photoRequired: true }).includes('/dashboard/photo'));
assert(hrefs('staff', { photoOpsAdmin: true }).includes('/dashboard/photo-ops'));
assert(hrefs('staff', { qcReportsInbox: true }).includes('/dashboard/qc-reports'));
assert(!hrefs('staff').includes('/dashboard/tasks'));
assert(!hrefs('assistant_manager').includes('/dashboard/tasks'));
assert(hrefs('qc').includes('/dashboard/photo-review'));
assert(hrefs('qc').includes('/dashboard/photo-archive'));
assert(hrefs('qc').includes('/dashboard/qc-reports'));
assert(hrefs('qc').includes('/dashboard/broadcast'));
assert(!hrefs('qc').includes('/dashboard/hr-notes'));
assert(hrefs('owner').includes('/dashboard/photo-review'));
assert(hrefs('owner').includes('/dashboard/photo-archive'));
assert(hrefs('owner').includes('/dashboard/photo-ops'));
assert(!hrefs('manager').includes('/dashboard/photo-archive'));
assert(!hrefs('staff').includes('/dashboard/photo-archive'));
assert(hrefs('staff', { hrKpiReviewer: true }).includes('/dashboard/photo-archive'));
assert(!hrefs('staff').some((h) => h.includes('/hr') || h.includes('/messages')));
assert(!hrefs('assistant_manager').some((h) => h.includes('/hr') || h.includes('/messages')));
assert(!hrefs('manager').some((h) => h.includes('/hr') || h.includes('/messages')));
assert(!hrefs('qc').some((h) => h.includes('/hr') || h.includes('/messages')));
assert(!hrefs('marketing').some((h) => h.includes('/qc') || h.includes('/forms') || h.includes('/hr')));
assert(hrefs('owner').some((h) => h.endsWith('/hr')));
assert.equal(getDashboardNavItems('owner').find((i) => i.href.endsWith('/hr'))?.labelKey, 'teamAccess');
assert(!hrefs('owner').some((h) => h.includes('/messages')));
assert(!hrefs('owner').some((h) => h.includes('/manager-reports')));
assert(!hrefs('owner').includes('/dashboard/ai'));
assert(!hrefs('qc').includes('/dashboard/ai'));
assert(!hrefs('staff').includes('/dashboard/sop'));
assert(hrefs('staff').includes('/dashboard/broadcast'));
assert(hrefs('assistant_manager').includes('/dashboard/broadcast'));
assert(!hrefs('owner').includes('/dashboard/broadcast'));
assert(!hrefs('staff').includes('/dashboard/hr-notes'));
assert(hrefs('staff', { hrKpiReviewer: true }).includes('/dashboard/hr-notes'));
assert(hrefs('staff', { hrKpiReviewer: true }).includes('/dashboard/hr'));

const qcHomeHrefs = getDashboardHomeTiles({ role: 'qc' }).map((t) => t.href);
assert.deepEqual(qcHomeHrefs, [
  '/dashboard/photo',
  '/dashboard/photo-review',
  '/dashboard/photo-archive',
  '/dashboard/kpi',
  '/dashboard/qc-reports',
  '/dashboard/broadcast',
  '/dashboard/support',
]);
assert(!qcHomeHrefs.includes('/dashboard/hr-notes'));
assert.deepEqual(
  getDashboardHomeTiles({ role: 'staff' }).map((t) => t.href),
  ['/dashboard/photo', '/dashboard/kpi', '/dashboard/broadcast', '/dashboard/support']
);
assert.deepEqual(
  getDashboardHomeTiles({ role: 'staff', hrKpiReviewer: true }).map((t) => t.href),
  [
    '/dashboard/photo',
    '/dashboard/hr-notes',
    '/dashboard/hr',
    '/dashboard/photo-archive',
    '/dashboard/kpi',
    '/dashboard/broadcast',
    '/dashboard/support',
  ]
);
assert.equal(getDashboardHomeTiles({ role: 'owner' }).length, 0);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const layout = fs.readFileSync(path.join(root, 'src/components/dashboard/DashboardLayoutClient.tsx'), 'utf8');
assert(!layout.includes('Open messages'));
assert(!layout.includes('router.back()'));
assert(layout.includes('setDrawerOpen(true)'));
assert(layout.includes('passive: false'));
assert(layout.includes('isInteractiveTarget'));
assert(layout.includes('dashboard-open-menu'));
assert(!layout.includes('if (atMenuEdge(t.clientX)) {\n        e.preventDefault();'));
const iosBridge = fs.readFileSync(path.join(root, 'ios/App/App/DrinkatBridgeViewController.swift'), 'utf8');
assert.match(iosBridge, /allowsBackForwardNavigationGestures = false/);
const home = fs.readFileSync(path.join(root, 'src/components/dashboard/DashboardHomeContent.tsx'), 'utf8');
assert(!home.includes('activityNoUnreadMessages'));
assert(home.includes('getDashboardHomeTiles'));
assert(home.includes('HomeTileIcon'));
assert(home.includes('text-ios-blue'));
assert(home.includes('yourKpi'));
assert(home.includes('kpiScore'));
assert(
  fs.readFileSync(path.join(root, 'src/app/dashboard/page.tsx'), 'utf8').includes('computeAndStoreEmployeeKpi')
);
assert(!home.includes('PhotoTaskBoard'));
assert(home.includes("role === 'owner' || role === 'manager'"));
const navLinks = fs.readFileSync(path.join(root, 'src/components/dashboard/DashboardNavLinks.tsx'), 'utf8');
assert(navLinks.includes('IconMegaphone'));
assert(navLinks.includes('IconArchive'));
assert(navLinks.includes("href.includes('/broadcast')"));
assert(navLinks.includes("href.includes('/photo-archive')"));
assert(navLinks.includes('m3 11 19-7v16L3 13v-2z'));

console.log('phase1-nav: ok');
