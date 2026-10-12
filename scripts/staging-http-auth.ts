/**
 * Live HTTP authorization matrix against drinkat-qc-staging ONLY.
 * Refuses production hostnames.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PRODUCTION_HOST = 'drinkat-management.technologiesbrightminds.workers.dev';
const STAGING_HOST = 'drinkat-qc-staging.technologiesbrightminds.workers.dev';

function loadStagingVars() {
  const raw = readFileSync(new URL('../.dev.vars.staging', import.meta.url), 'utf8');
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map.set(t.slice(0, i), t.slice(i + 1).replace(/^"|"$/g, ''));
  }
  return map;
}

const vars = loadStagingVars();
const base = (vars.get('STAGING_URL') ?? vars.get('NEXTAUTH_URL') ?? '').replace(/\/$/, '');
const password = vars.get('STAGING_TEST_PASSWORD') ?? '';
const cronSecret = vars.get('CRON_SECRET') ?? '';

if (!base.includes(STAGING_HOST) || base.includes(PRODUCTION_HOST) || base.includes('drinkat-management')) {
  throw new Error(`REFUSED: STAGING_URL is not isolated staging: ${base}`);
}
if (password.length < 10) throw new Error('STAGING_TEST_PASSWORD missing');
if (!cronSecret) throw new Error('CRON_SECRET missing in .dev.vars.staging');

type CookieJar = string[];

async function login(email: string): Promise<CookieJar> {
  const csrfRes = await fetch(`${base}/api/auth/csrf`, { redirect: 'manual' });
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookieHeader = csrfCookies.map((c) => c.split(';')[0]).join('; ');
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: 'true',
    callbackUrl: `${base}/dashboard`,
  });
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader,
      Origin: base,
    },
    body,
    redirect: 'manual',
  });
  const set = res.headers.getSetCookie?.() ?? [];
  const jar = [...csrfCookies, ...set].map((c) => c.split(';')[0]).filter(Boolean);
  const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: jar.join('; ') } });
  const json = (await session.json()) as { user?: { email?: string } };
  assert.equal(json.user?.email, email, `login failed for ${email}: ${JSON.stringify(json)}`);
  return jar;
}

async function req(jar: CookieJar | null, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (jar) headers.set('Cookie', jar.join('; '));
  if (!headers.has('Origin')) headers.set('Origin', base);
  const res = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, text };
}

function emails(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => {
      const r = row as { user?: { email?: string }; email?: string; name?: string };
      return r.user?.email ?? r.email ?? r.name ?? '';
    })
    .filter(Boolean);
}

const results: string[] = [];
function pass(msg: string) {
  results.push(`PASS ${msg}`);
}
function fail(msg: string, extra?: unknown) {
  results.push(`FAIL ${msg}${extra ? ` :: ${JSON.stringify(extra).slice(0, 240)}` : ''}`);
}

async function main() {
  // Unauthenticated
  const unauthEmployees = await req(null, '/api/employees');
  unauthEmployees.status === 401 || unauthEmployees.status === 307
    ? pass(`unauth /api/employees ${unauthEmployees.status} (307 documented)`)
    : fail('unauth employees', unauthEmployees.status);
  const unauthForms = await req(null, '/api/forms/submissions');
  unauthForms.status === 401 || unauthForms.status === 307
    ? pass(`unauth /api/forms/submissions ${unauthForms.status} (307 documented)`)
    : fail('unauth forms', unauthForms.status);
  const unauthChat = await req(null, '/api/chat/threads');
  unauthChat.status === 401 || unauthChat.status === 403 || unauthChat.status === 307
    ? pass(`unauth /api/chat/threads ${unauthChat.status} (307 documented)`)
    : fail('unauth chat', unauthChat.status);
  const health = await req(null, '/api/health/ready');
  health.status === 200 ? pass('health/ready 200') : fail('health', health.status);
  const cronNo = await req(null, '/api/cron/time-clock');
  cronNo.status === 401 ? pass('cron no secret 401') : fail('cron no secret', cronNo.status);
  const cronWrong = await req(null, '/api/cron/time-clock?secret=not-the-staging-secret');
  cronWrong.status === 401 ? pass('cron wrong secret 401') : fail('cron wrong', cronWrong.status);

  const owner = await login('stg-owner@qc-staging.local');
  const qc = await login('stg-qc@qc-staging.local');
  const mgrA = await login('stg-manager-a@qc-staging.local');
  const mgrB = await login('stg-manager-b@qc-staging.local');
  const am = await login('stg-am@qc-staging.local');
  const staffA = await login('stg-staff-a@qc-staging.local');
  const staffB = await login('stg-staff-b@qc-staging.local');
  const mkt = await login('stg-marketing@qc-staging.local');

  const ownerEmp = await req(owner, '/api/employees');
  const ownerEmails = emails(ownerEmp.json);
  ownerEmp.status === 200 && ownerEmails.some((e) => e.includes('staff-a')) && ownerEmails.some((e) => e.includes('staff-b'))
    ? pass('owner sees both branches')
    : fail('owner employees', { status: ownerEmp.status, emails: ownerEmails });

  const exportRes = await req(owner, '/api/hr/export');
  exportRes.status === 200 ? pass('owner hr/export 200') : fail('hr/export', exportRes.status);

  const ownerChat = await req(owner, '/api/chat/threads');
  ownerChat.status === 403 ? pass('owner chat frozen 403') : fail('owner chat', ownerChat.status);
  const ownerAdv = await req(owner, '/api/advances');
  ownerAdv.status === 403 ? pass('owner advances frozen 403') : fail('owner advances', ownerAdv.status);
  const ownerLeave = await req(owner, '/api/leave');
  ownerLeave.status === 403 ? pass('owner leave frozen 403') : fail('owner leave', ownerLeave.status);

  const hist = await req(owner, '/api/forms/submissions');
  const histList = Array.isArray(hist.json) ? hist.json : [];
  const histRow = histList.find((s: { id?: string }) => s.id === 'stg_hist_sub_1') as
    | { template?: { fields?: { key: string }[] }; answers?: Record<string, string> }
    | undefined;
  const keys = (histRow?.template?.fields ?? []).map((f) => f.key);
  keys.includes('old_field') && !keys.includes('new_field') && histRow?.answers?.old_field === 'legacy-answer-must-render'
    ? pass('historical submission renders v1 fields not live new_field')
    : fail('historical render', { keys, answers: histRow?.answers, status: hist.status, n: histList.length });

  const qcEmp = await req(qc, '/api/employees');
  emails(qcEmp.json).some((e) => e.includes('staff-b'))
    ? pass('qc org-wide employees')
    : fail('qc employees', emails(qcEmp.json));

  const mgrAEmp = await req(mgrA, '/api/employees');
  const mgrAEmails = emails(mgrAEmp.json);
  mgrAEmails.some((e) => e.includes('staff-a') || e.includes('Staging Staff A')) &&
  !mgrAEmails.some((e) => e.includes('staff-b') || e.includes('Staging Staff B'))
    ? pass('manager A cannot see branch B staff')
    : fail('manager A employees', mgrAEmails);

  const mgrBEmp = await req(mgrB, '/api/employees');
  const mgrBEmails = emails(mgrBEmp.json);
  !mgrBEmails.some((e) => e.includes('staff-a') || e.includes('Staging Staff A'))
    ? pass('manager B cannot see branch A staff')
    : fail('manager B employees', mgrBEmails);

  const amEmp = await req(am, '/api/employees');
  const amEmails = emails(amEmp.json);
  amEmp.status === 200 && amEmails.length <= 1
    ? pass(`assistant manager self-only employees (${amEmails.length})`)
    : fail('am employees', amEmails);

  const amChecklists = await req(am, '/api/checklists');
  amChecklists.status === 403 ? pass('AM checklists 403') : fail('AM checklists', amChecklists.status);
  const amReports = await req(am, '/api/reports');
  amReports.status === 403 ? pass('AM reports 403') : fail('AM reports', amReports.status);
  const amChat = await req(am, '/api/chat/users');
  amChat.status === 403 ? pass('AM chat 403') : fail('AM chat', amChat.status);

  const staffAEmp = await req(staffA, '/api/employees');
  const staffAEmails = emails(staffAEmp.json);
  !staffAEmails.some((e) => e.includes('staff-b'))
    ? pass('staff A cannot list staff B')
    : fail('staff A employees', staffAEmails);

  const staffBSubs = await req(staffB, '/api/forms/submissions');
  const staffBList = Array.isArray(staffBSubs.json) ? staffBSubs.json : [];
  !staffBList.some((s: { id?: string }) => s.id === 'stg_hist_sub_1')
    ? pass('staff B cannot read staff A historical submission')
    : fail('staff B leaked historical', staffBList.length);

  const staffChat = await req(staffA, '/api/chat/threads');
  staffChat.status === 403 ? pass('staff chat 403') : fail('staff chat', staffChat.status);

  const mktReports = await req(mkt, '/api/reports');
  mktReports.status === 403 ? pass('marketing reports 403') : fail('marketing reports', mktReports.status);

  const mgrMut = await req(mgrA, '/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'x' }),
  });
  mgrMut.status === 403 ? pass('manager POST /api/employees 403') : fail('manager create employee', mgrMut.status);

  const cronOk = await req(null, '/api/cron/time-clock', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  cronOk.status === 200 || cronOk.status === 503
    ? pass(`cron staging secret accepted (${cronOk.status})`)
    : fail('cron staging secret', cronOk.status);
  if (cronOk.status === 200 && cronOk.json && typeof cronOk.json === 'object') {
    const cronJson = cronOk.json as { inspectionScheduler?: boolean };
    cronJson.inspectionScheduler === true
      ? pass('cron inspection scheduler enabled in staging')
      : fail('cron inspection scheduler', String(cronJson.inspectionScheduler));
  }

  const staffIssues = await req(staffA, '/api/issues');
  staffIssues.status === 403 ? pass('staff issues 403') : fail('staff issues', staffIssues.status);
  const amIssues = await req(am, '/api/issues');
  amIssues.status === 200 ? pass('AM issues 200') : fail('AM issues', amIssues.status);
  const staffBranchKpi = await req(staffA, '/api/kpi/branch');
  staffBranchKpi.status === 403 ? pass('staff branch KPI 403') : fail('staff branch KPI', staffBranchKpi.status);
  const staffOwnKpi = await req(staffA, '/api/kpi/me');
  const staffKpiJson = staffOwnKpi.json as { mode?: string; employmentDecisionUse?: boolean; purpose?: string };
  staffOwnKpi.status === 200 &&
  staffKpiJson.mode === 'operational' &&
  staffKpiJson.employmentDecisionUse === false
    ? pass('staff own KPI operational / not employment')
    : fail('staff own KPI', { status: staffOwnKpi.status, staffKpiJson });
  const staffHr = await req(staffA, '/api/kpi/hr-reviews');
  staffHr.status === 403 ? pass('staff HR KPI review 403') : fail('staff HR review', staffHr.status);
  const ownerHr = await req(owner, '/api/kpi/hr-reviews');
  ownerHr.status === 200 ? pass('owner HR KPI review 200') : fail('owner HR review', ownerHr.status);
  const ownerEsc = await req(owner, '/api/escalation-rules');
  ownerEsc.status === 200 ? pass('owner escalation rules 200') : fail('owner escalation', ownerEsc.status);
  const staffEsc = await req(staffA, '/api/escalation-rules');
  staffEsc.status === 403 ? pass('staff escalation 403') : fail('staff escalation', staffEsc.status);
  const aiSop = await req(staffA, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'sop', input: { question: 'closing' } }),
  });
  const aiJson = aiSop.json as { mocked?: boolean; code?: string; error?: string };
  aiSop.status >= 400 && aiJson.mocked === false
    ? pass(`AI fails closed (${aiSop.status} ${aiJson.code ?? ''})`)
    : fail('AI should not mock', aiSop.status);
  const aiStatus = await req(staffA, '/api/ai/status');
  const st = aiStatus.json as { live?: boolean; mocked?: boolean; blockers?: string[] };
  aiStatus.status === 200 && st.mocked === false
    ? pass(st.live ? 'AI status live' : `AI status blocked (${(st.blockers ?? []).join(',')})`)
    : fail('AI status', aiStatus.status);
  const staffTasks = await req(staffA, '/api/inspections/tasks');
  staffTasks.status === 200 ? pass('staff tasks 200') : fail('staff tasks', staffTasks.status);
  const ownerTpls = await req(owner, '/api/forms/templates');
  const tplList = Array.isArray(ownerTpls.json) ? ownerTpls.json : [];
  const ops = tplList.find((t: { title?: string }) => t.title === 'Staging Ops Check') as
    | { id?: string }
    | undefined;
  if (ops?.id) {
    const vers = await req(owner, `/api/forms/templates/${ops.id}/versions`);
    const vjson = vers.json as { currentVersionId?: string; versions?: { id: string; versionNumber: number; fields: unknown[] }[] };
    const current = vjson.versions?.find((v) => v.id === vjson.currentVersionId);
    current && current.fields.length === 3
      ? pass('published currentVersion is v2 with 3 fields')
      : fail('currentVersion fields', current?.fields.length ?? 'missing');
    const v1 = vjson.versions?.find((v) => v.versionNumber === 1);
    v1 && v1.fields.length === 2 ? pass('historical v1 still 2 fields') : fail('v1 fields', v1?.fields.length ?? 'missing');
  } else {
    fail('ops template missing', 404);
  }

  const taskList = Array.isArray(staffTasks.json) ? staffTasks.json : [];
  const openTask = taskList.find((t: { status?: string }) =>
    ['scheduled', 'due', 'in_progress', 'overdue'].includes(String(t.status))
  ) as { id?: string; fields?: { key: string; type: string; failValues?: string[] }[] } | undefined;
  if (!openTask?.id) {
    fail('no open staff task after cron', taskList.length);
  } else {
    const detail = await req(staffA, `/api/inspections/tasks/${openTask.id}`);
    const fields = ((detail.json as { fields?: { key: string; type: string; failValues?: string[]; required?: boolean; showIf?: unknown }[] })
      .fields ?? []);
    const answers: Record<string, string> = {};
    for (const f of fields) {
      if (f.showIf) continue;
      if (f.type === 'select') answers[f.key] = f.failValues?.[0] ?? 'fail';
      else if (f.type === 'photo') answers[f.key] = '/uploads/staging-before.jpg';
      else if (f.type === 'checkbox') answers[f.key] = 'true';
      else answers[f.key] = 'ok';
    }
    for (const f of fields) {
      if (f.failValues && answers[f.key] === f.failValues[0]) {
        answers[`${f.key}_photo`] = '/uploads/staging-before.jpg';
      }
    }
    const started = await req(staffA, `/api/inspections/tasks/${openTask.id}/start`, { method: 'POST' });
    started.status === 200 ? pass('staff start inspection') : fail('start inspection', started.status);
    const submitted = await req(staffA, `/api/inspections/tasks/${openTask.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const subJson = submitted.json as { issuesCreated?: number; error?: string };
    submitted.status === 200 && (subJson.issuesCreated ?? 0) > 0
      ? pass(`fail answers created ${subJson.issuesCreated} issue(s)`)
      : fail('submit inspection', submitted.status + ' ' + (subJson.error ?? ''));
    const preview = await req(staffA, `/api/inspections/tasks/${openTask.id}`);
    const previewJson = preview.json as { readOnly?: boolean; status?: string; submittedAnswers?: Record<string, unknown> | null };
    preview.status === 200 &&
    previewJson.readOnly === true &&
    previewJson.status === 'completed' &&
    previewJson.submittedAnswers &&
    Object.keys(previewJson.submittedAnswers).length > 0
      ? pass('completed task preview is read-only with submitted answers')
      : fail('completed task preview', { status: preview.status, previewJson });

    const mgrIssues = await req(mgrA, '/api/issues');
    const issues = Array.isArray(mgrIssues.json) ? mgrIssues.json : [];
    const issue = issues[0] as { id?: string } | undefined;
    if (!issue?.id) {
      fail('manager sees no issue', issues.length);
    } else {
      const ack = await req(mgrA, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', status: 'acknowledged' }),
      });
      ack.status === 200 ? pass('manager acknowledged issue') : fail('acknowledge', ack.status);
      await req(mgrA, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', status: 'in_progress' }),
      });
      const fixed = await req(mgrA, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transition',
          status: 'fixed',
          afterPhotoPath: '/uploads/staging-after.jpg',
          correctiveAction: 'Corrected on staging',
        }),
      });
      fixed.status === 200 ? pass('manager marked fixed with after photo') : fail('fixed', fixed.status);
      const mgrVerify = await req(mgrA, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', status: 'verified' }),
      });
      mgrVerify.status === 400 ? pass('manager cannot verify own correction') : fail('manager verify', mgrVerify.status);
      const qcVerify = await req(qc, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', status: 'verified' }),
      });
      qcVerify.status === 200 ? pass('QC verified issue') : fail('QC verify', qcVerify.status);
      const closed = await req(qc, `/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transition', status: 'closed' }),
      });
      closed.status === 200 ? pass('QC closed issue') : fail('QC close', closed.status);
    }
  }

  const staffBTasks = await req(staffB, '/api/inspections/tasks');
  const staffBIds = (Array.isArray(staffBTasks.json) ? staffBTasks.json : []).map((t: { id?: string }) => t.id);
  const staffAIds = taskList.map((t: { id?: string }) => t.id);
  !staffBIds.some((id: string | undefined) => id && staffAIds.includes(id))
    ? pass('staff B does not see staff A task ids')
    : fail('cross-employee task leak', staffBIds.length);

  const staffTpls = await req(staffA, '/api/forms/templates');
  const staffTplList = Array.isArray(staffTpls.json) ? staffTpls.json : [];
  const openingOnForms = staffTplList.some(
    (t: { category?: string }) =>
      t.category === 'opening_checklist' || t.category === 'closing_checklist'
  );
  !openingOnForms
    ? pass('opening/closing not in staff forms catalog')
    : fail('opening on forms catalog', staffTplList.length);

  const openingTpl = tplList.find((t: { category?: string; id?: string }) => t.category === 'opening_checklist') as
    | { id?: string }
    | undefined;
  if (openingTpl?.id) {
    const staffVers = await req(staffA, `/api/forms/templates/${openingTpl.id}/versions`);
    staffVers.status === 403
      ? pass('staff cannot read opening template versions')
      : fail('staff opening versions', staffVers.status);
  }

  const foreignUpload = await req(staffB, '/api/uploads/does-not-exist-uuid.jpg');
  foreignUpload.status === 403 || foreignUpload.status === 404
    ? pass(`upload without ownership denied ${foreignUpload.status}`)
    : fail('upload IDOR', foreignUpload.status);

  const staffSop = await req(staffA, '/api/sop/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Should fail',
      locale: 'en',
      body: 'x',
      sourceRef: 'SYNTHETIC:staff',
    }),
  });
  staffSop.status === 403 ? pass('staff SOP ingest 403') : fail('staff SOP ingest', staffSop.status);

  const synthApproved = await req(owner, '/api/sop/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Synthetic opening notes',
      locale: 'en',
      body: 'TEST ONLY. Do not treat as an approved DRINKAT SOP.',
      sourceRef: 'SYNTHETIC:staging-ingest',
      approved: true,
    }),
  });
  synthApproved.status === 400
    ? pass('synthetic SOP cannot be marked approved')
    : fail('synthetic approved', synthApproved.status);

  const synthIngest = await req(owner, '/api/sop/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Synthetic opening notes',
      locale: 'en',
      body: 'TEST ONLY. Do not treat as an approved DRINKAT SOP.',
      sourceRef: 'SYNTHETIC:staging-ingest',
      approved: false,
    }),
  });
  const ingestJson = synthIngest.json as { approved?: boolean; synthetic?: boolean };
  synthIngest.status === 200 && ingestJson.approved === false && ingestJson.synthetic === true
    ? pass('synthetic SOP ingested unapproved')
    : fail('synthetic ingest', { status: synthIngest.status, ingestJson });

  const staffSearch = await req(staffA, '/api/sop/search?q=handwash');
  staffSearch.status === 403 ? pass('staff SOP draft search 403') : fail('staff SOP search', staffSearch.status);

  const enSearch = await req(owner, `/api/sop/search?q=${encodeURIComponent('When should food employees wash their hands?')}&locale=en`);
  const enJson = enSearch.json as {
    approvedAnswersEnabled?: boolean;
    fdaIndex?: { section: string }[];
    draftLibrary?: { sourceRef: string }[];
  };
  enSearch.status === 200 &&
  enJson.approvedAnswersEnabled === false &&
  (enJson.fdaIndex ?? []).some((c) => c.section.startsWith('2-301'))
    ? pass('EN FDA draft search hits 2-301')
    : fail('EN FDA search', { status: enSearch.status, enJson });

  const arSearch = await req(owner, `/api/sop/search?q=${encodeURIComponent('متى يجب غسل اليدين')}&locale=ar`);
  const arJson = arSearch.json as {
    approvedAnswersEnabled?: boolean;
    fdaIndex?: { section: string }[];
    draftLibrary?: { locale: string }[];
  };
  arSearch.status === 200 &&
  arJson.approvedAnswersEnabled === false &&
  (arJson.fdaIndex ?? []).some((c) => c.section.startsWith('2-301'))
    ? pass('AR FDA draft search hits 2-301')
    : fail('AR FDA search', { status: arSearch.status, arJson });

  const docsList = await req(owner, '/api/sop/documents');
  const docsJson = docsList.json as {
    documents?: { id: string; approved: boolean; sourceRef: string }[];
    sopAssistant?: string;
  };
  const draftRow = (docsJson.documents ?? []).find((d) => d.sourceRef.startsWith('DRAFT:'));
  const manuals = (docsJson.documents ?? []).filter((d) => d.sourceRef.startsWith('DRINKAT-MANUAL:'));
  const blockedSources = (docsJson.documents ?? []).filter(
    (d) => d.sourceRef.startsWith('DRAFT:') || d.sourceRef.startsWith('FDA:') || d.sourceRef.startsWith('SYNTHETIC:')
  );
  const manualsOk = manuals.length === 0 || manuals.every((d) => d.approved);
  const blockedOk = blockedSources.every((d) => d.approved === false);
  docsList.status === 200 && manualsOk && blockedOk
    ? pass(`SOP list manuals=${manuals.filter((d) => d.approved).length} approved; FDA/DRAFT/SYNTHETIC unapproved`)
    : fail('SOP list', { status: docsList.status, sopAssistant: docsJson.sopAssistant, manuals: manuals.length });

  if (draftRow) {
    const approve = await req(owner, `/api/sop/documents/${draftRow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    const approveJson = approve.json as { approved?: boolean };
    approve.status === 400 && approveJson.approved === false
      ? pass('FDA draft approve hard-400')
      : fail('FDA draft approve', { status: approve.status, approveJson });
    const adopted = await req(owner, `/api/sop/documents/${draftRow.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adopt' }),
    });
    const adoptedJson = adopted.json as { approved?: boolean; sourceRef?: string; id?: string };
    adopted.status === 200 && adoptedJson.approved === false && String(adoptedJson.sourceRef ?? '').startsWith('DRINKAT-ADOPTED:')
      ? pass('FDA draft adopted as unapproved DRINKAT candidate')
      : fail('FDA adopt', { status: adopted.status, adoptedJson });
    if (adoptedJson.id) {
      const early = await req(owner, `/api/sop/documents/${adoptedJson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      early.status === 400
        ? pass('adopted SOP approve before qc_reviewed is 400')
        : fail('early adopted approve', early.status);
    }
  } else {
    fail('FDA draft row missing after ingest', docsJson);
  }

  const sopRun = await req(owner, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'sop', input: { question: 'How do we open the store?' } }),
  });
  const sopJson = sopRun.json as { code?: string; mocked?: boolean };
  (sopRun.status === 503 || sopRun.status === 422) && sopJson.mocked === false
    ? pass(`SOP assistant still blocked (${sopJson.code ?? sopRun.status})`)
    : fail('SOP still live', { status: sopRun.status, sopJson });

  // --- Photo catalog / exemptions / Sara-scoped flags ---
  const staffAOps = await req(staffA, '/api/photo-ops/employees');
  staffAOps.status === 403 ? pass('staff-a cannot manage photo ops') : fail('staff-a photo-ops', staffAOps.status);
  const staffBOps = await req(staffB, '/api/photo-ops/employees');
  staffBOps.status === 200 ? pass('staff-b (synthetic Sara) photo-ops 200') : fail('staff-b photo-ops', staffBOps.status);
  const staffBSalary = await req(staffB, '/api/salary');
  staffBSalary.status === 403 || staffBSalary.status === 401
    ? pass(`staff-b salary blocked ${staffBSalary.status}`)
    : fail('staff-b salary', staffBSalary.status);
  const staffBHr = await req(staffB, '/api/hr/export');
  staffBHr.status === 403 || staffBHr.status === 401
    ? pass(`staff-b hr/export blocked ${staffBHr.status}`)
    : fail('staff-b hr export', staffBHr.status);
  const staffBReports = await req(staffB, '/api/qc-reports');
  staffBReports.status === 200 ? pass('staff-b qc-reports inbox 200') : fail('staff-b qc-reports', staffBReports.status);
  const staffAReports = await req(staffA, '/api/qc-reports');
  staffAReports.status === 403 ? pass('staff-a qc-reports denied') : fail('staff-a qc-reports', staffAReports.status);
  const mktOps = await req(mkt, '/api/photo-ops/employees');
  mktOps.status === 403 ? pass('marketing photo-ops denied') : fail('marketing photo-ops', mktOps.status);

  const typesRes = await req(owner, '/api/photo-ops/types');
  const typesJson = typesRes.json as { types?: { code: string; active: boolean; provisional: boolean }[] };
  const typeCodes = (typesJson.types ?? []).map((t) => t.code);
  typesRes.status === 200 && typeCodes.includes('slush_machine_cleaning') && !typeCodes.includes('shisha')
    ? pass('catalog includes slush, not shisha')
    : fail('catalog titles', { status: typesRes.status, typeCodes });
  const provisionalOff = (typesJson.types ?? []).filter((t) => t.provisional).every((t) => !t.active);
  provisionalOff ? pass('provisional types inactive') : fail('provisional active', typesJson.types);

  const cronPhoto1 = await req(null, `/api/cron/time-clock?secret=${encodeURIComponent(cronSecret)}`);
  const cron1Json = cronPhoto1.json as {
    photoCheckScheduler?: boolean;
    photoGeneration?: { created?: number; skipped?: number };
  };
  cronPhoto1.status === 200 && cron1Json.photoCheckScheduler === true
    ? pass(`cron photo scheduler on (created=${cron1Json.photoGeneration?.created ?? '?'})`)
    : fail('cron photo scheduler', { status: cronPhoto1.status, cron1Json });

  const staffATasks = await req(staffA, '/api/photo-checks/tasks');
  const aTasks = staffATasks.json as { required?: boolean; items?: { id: string; slotKey: string }[] };
  const slots = new Set((aTasks.items ?? []).map((t) => t.slotKey));
  staffATasks.status === 200 && aTasks.required === true && slots.has('morning') && slots.has('midday') && slots.has('night')
    ? pass(`staff-a 360 has 3 slots (${[...slots].join(',')})`)
    : fail('staff-a 360 slots', { status: staffATasks.status, aTasks });

  const cronPhoto2 = await req(null, `/api/cron/time-clock?secret=${encodeURIComponent(cronSecret)}`);
  const cron2Json = cronPhoto2.json as { photoGeneration?: { created?: number; skipped?: number } };
  cronPhoto2.status === 200 && (cron2Json.photoGeneration?.created ?? 1) === 0
    ? pass('repeated cron created 0 extra photo tasks')
    : fail('cron duplicate photo tasks', cron2Json.photoGeneration);

  const staffBPhotoTasks = await req(staffB, '/api/photo-checks/tasks');
  const bPhotoTasks = staffBPhotoTasks.json as { required?: boolean; items?: unknown[] };
  staffBPhotoTasks.status === 200 && bPhotoTasks.required === false && (bPhotoTasks.items?.length ?? 0) === 0
    ? pass('staff-b global OFF has zero photo tasks')
    : fail('staff-b photo tasks', { status: staffBPhotoTasks.status, bPhotoTasks });

  const qcQueue = await req(qc, '/api/photo-checks/queue');
  qcQueue.status === 200 ? pass('qc photo queue 200') : fail('qc photo queue', qcQueue.status);
  const staffAQueue = await req(staffA, '/api/photo-checks/queue');
  staffAQueue.status === 403 ? pass('staff-a cannot swipe photos') : fail('staff-a queue', staffAQueue.status);

  const failed = results.filter((l) => l.startsWith('FAIL'));
  for (const line of results) console.log(line);
  console.log(`staging-http-auth: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
