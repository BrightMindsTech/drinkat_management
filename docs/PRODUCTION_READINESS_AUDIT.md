# DRINKAT QC — Production readiness audit

**Date:** 2026-10-10  
**Scope:** repository inspection of `drinkat_management` (staging-authorized work only)  
**Production Worker / D1 / R2:** not opened  

Status labels in “Disposition” mean what was done in this hardening pass.

## Method

Reviewed on-disk pages, 86 API routes, Prisma schema, migrations 0001–0019, auth/session/middleware, permissions registry, inspection/issue/KPI/AI libraries, Capacitor identifiers, locales, and existing staging HTTP/AI tests. Findings below are tied to file evidence. Problems were not invented.

---

## P0

None remaining after this pass.

| ID | Problem | Evidence | Impact | Risk | Proposed / done | Verification | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | KPI compute fed recurrence from `reopenCount` and ignored `repeat_issue_window_days` / question-key repeats | `src/lib/kpi-compute.ts` (pre-fix) vs `docs/KPI_SPECIFICATION.md` §C | Shadow scores could reward or punish the wrong recurrence | Misleading management decisions if shadow scores are trusted | Implemented `src/lib/kpi-evidence.ts` question-key repeats, 14-day window from `QcAppConfig`, employee-attributed Employee Error only | `scripts/test-prod-hardening.ts` | **Fixed** (shadow only; official still blocked) |

---

## P1

| ID | Problem | Evidence | User impact | Risk | Correction | Verification | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | Any signed-in user could GET `/api/uploads/{key}` | `uploads/[[...segments]]/route.ts` had no session/ownership check; policy was `public` | ID / QC / HR photos readable across branches if a URL leaked | Cross-user/cross-branch disclosure | Session + `actorCanReadUpload` (uploader, issue, own submission/draft/document, owner/QC). `UploadObject` table. `Cache-Control: private, no-store` | Unit source asserts; staging GET unknown key 403/404 | **Fixed** (legacy blobs without `UploadObject` still readable if referenced by an accessible row) |
| P1-2 | `POST /api/ai/run` loaded arbitrary `imagePath` | `src/lib/ai-images.ts` + `ai/run/route.ts` | Staff with `ai:use` could exfiltrate another user’s photo via the model | Same as P1-1 | `assertImage` calls `actorCanReadUpload` before R2 read | Code review + staging after deploy | **Fixed** |
| P1-3 | Double submit created duplicate submissions/issues | `inspections/tasks/[id]/submit/route.ts` checked status then created without a claim | Duplicate issues, KPI skew | Operational noise | `updateMany` claim on `submittedAt: null` before create; revert on failure; reject empty field sets | Source assert `updateMany`; staging journey still one issue set per fail submit | **Fixed** |
| P1-4 | Opening/closing templates also fillable via Forms | `formVisibility.ts` `isQcFormCategory` omitted `opening_checklist` / `closing_checklist`; seed uses those categories | Staff could complete the same checklist twice; Forms path created no issues | Missed corrective work | Scheduled inspection categories blocked from fill catalog for every role | Unit `canUserFillTemplate` false; staging catalog check | **Fixed** |
| P1-5 | Checklist quality used weight-sum as the ≥20 evidence gate | `kpi-engine.ts` `componentFromRatio(..., qualityWeightSum, 20)` | Weight≠1 fields changed Scored vs Provisional | Incorrect shadow quality status | `checklistQualityComponent` uses `weightedAnswers` | `test-prod-hardening.ts` | **Fixed** |
| P1-6 | Critical SLA ignored pre-period overdue open criticals | `kpi-compute.ts` filtered issues by `createdAt` in period first | Branch Manager critical score optimistic | Hidden open criticals | `criticalSlaParts` includes any open overdue critical | Unit overdue from September counted in October | **Fixed** |
| P1-7 | Corrective “on time” = any closed issue | `closedOnTime` ignored SLA | 100% on slow closures | Inflated corrective scores | `closedWithinSla` vs configured escalation hours (defaults remain unapproved) | Unit | **Fixed** |
| P1-8 | Staff recurrence gated on any branch Employee Error | `periodIssues.some(...)` | One colleague’s EE enabled another’s recurrence component | Unfair individual penalty | Staff gate = attributed inspection assignee + approved EE | Unit + compute change | **Fixed** |
| P1-9 | Template versions readable by any session | `forms/templates/[id]/versions/route.ts` vs `[id]/route.ts` | Form design leakage | Recon | Same `canUserFillTemplate` / inactive rules as single-template GET | Staging staff opening versions 403 | **Fixed** |
| P1-10 | Missing `NEXTAUTH_SECRET` fell back to a hardcoded string | `src/lib/auth.ts` | Forgeable sessions if production ever booted without a secret | Account takeover | Fail fast on production Worker host / `REQUIRE_AUTH_SECRET=1` | Code review; production not executed | **Fixed** (conditional; staging/local still allow unset for existing workflow) |

---

## P2

| ID | Problem | Evidence | Impact | Risk | Correction | Verification | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-1 | Escalation ignored `notifyRolesJson` and repeated every cron tick | `inspection-reminders.ts` | Owner/QC spam; managers never escalated | Alert fatigue | Honor notify JSON; `lastEscalatedAt` 24h cooldown | Unit source + schema 0019 | **Fixed** |
| P2-2 | Inspection due reminders every 5 minutes | same file | Push noise | Fatigue | `lastRemindedAt` 12h cooldown | Schema 0019 | **Fixed** |
| P2-3 | New issues did not notify the assigned manager specifically | submit notified owners + staff’s reporting manager only | SLA delay | Missed corrections | Notify branch manager assignee; category `issue_opened` | Staging journey still 200 | **Fixed** |
| P2-4 | Empty/corrupt template could complete with zero answers | `parseTemplateFields` → `[]` then submit | False completion | Compliance gap | Submit 400 if `fields.length === 0` | Source assert | **Fixed** |
| P2-5 | Draft writes on completed tasks | `draft/route.ts` | Low | Stale drafts | Terminal-status 400 | Source | **Fixed** |
| P2-6 | Voice confirm checkbox unused; no language | `AiPanel.tsx` | Transcript not saved; AR/EN not sent | Incomplete voice UX | Language select + confirm-gated save | Code | **Fixed** (saved on AI screen only; not written into an inspection field) |
| P2-7 | Manager UI showed Verify/Close | `IssueDetail.tsx` | Confusing 400s | UX | Hide unless `viewer.canVerify` | Code | **Fixed** |
| P2-8 | Dev uploads used static `/uploads/*` | `upload-storage.ts` | Unauthenticated local reads | Dev/prod mismatch | Always return `/api/uploads/...` | Source | **Fixed** |
| P2-9 | Public cache on upload responses | upload GET headers | Shared-device leak | Cache disclosure | `private, no-store` | Source | **Fixed** |
| P2-10 | Dual legacy QC checklists + new inspection tasks | `/dashboard/qc` still exists | Duplicate work if both assigned | Ops confusion | Not retired (product decision) | Documented | **Open — business** |
| P2-11 | AI rate limit is per-isolate Map | `ai-rate-limit.ts` | Weak cost cap across isolates | Spend | Left as-is (avoid new infra) | Documented | **Open — accepted residual** |
| P2-12 | Photo QC suggestion not required before submit | `GuidedInspection.tsx` | Human confirm is messaging-only | Expected | Left (human confirm remains mandatory copy; submit uses staff answers) | Documented | **Accepted** |

---

## P3

| ID | Problem | Disposition |
| --- | --- | --- |
| P3-1 | `QC_COMPLETION_REPORT.md` still labels AI MOCKED | Stale docs; superseded by this audit + readiness report |
| P3-2 | `KPI_SPECIFICATION.md` still says engine not implemented | Spec formulas remain source of truth; header is stale |
| P3-3 | `client-error` is unauthenticated | Residual log-spam risk; not changed (would break beacons) |
| P3-4 | `push/test` any session, self-only | Residual |
| P3-5 | Mixed English field labels / some raw status strings | Partial locale keys added; template labels remain English |
| P3-6 | No physical iPhone camera→R2 confirmation | **BLOCKED** (no device) |
| P3-7 | Arabic spoken clip not separately tested | **BLOCKED** (no recorded AR sample this pass) |
| P3-8 | Official KPI publication cannot complete without owner cycle approval | **Intentional BLOCKED** |

---

## Verified OK (not defects)

- Scheduler double-gated: `INSPECTION_SCHEDULER_ENABLED` + `schedule.active`. Production `wrangler.jsonc` does not set the flag.
- iOS bundle `com.bmtechs.drinkat` and UA `DrinkatHR-Native` unchanged.
- AM ≠ manager (`dataScopeForRole` self; no `inspections:viewBranch`).
- Managers cannot verify/close (`actorMayVerify` owner/qc only).
- Issue unique `sourceAnswerId`; task unique `(scheduleId, assigneeEmployeeId, periodKey)`.
- Historical submissions pin `templateVersionId` / `pinnedSubmissionFieldsJson`.
- AI fail-closed, `mocked: false`, no `mockAi`. SOP uses approved `SopDocument` only.
- AI never writes KPI. Official store mode remains `shadow`.
- Unauthenticated `/api/*` 307 documented; middleware not rewritten.
- Permissions registry parity: 86 disk routes = `API_ROUTE_POLICIES`.
- Migrations 0016–0019 additive (no DROP/DELETE).

---

## Acceptance gates (this audit)

| Gate | Result |
| --- | --- |
| A Functional | API journey implemented; UI present; browser confirmation pending this pass |
| B Security | P1 upload/AI/IDOR addressed in code; staging retest required after deploy |
| C Data | Additive 0019; historical rows preserved; production migrate not executed |
| D KPI | Engine + compute now match spec on recurrence/SLA/quality count; official blocked |
| E AI | Live staging previously 8/8; SOP still blocked; ingest exists for SYNTHETIC unapproved only |
| F Mobile | Touch targets improved on issue/AI screens; physical iPhone BLOCKED |
| G Operations | Reminder/escalation deduped; scheduler still staging-only |
| H Release | Business approvals still required → **NO-GO** for production |
