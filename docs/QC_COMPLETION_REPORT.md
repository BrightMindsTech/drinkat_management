# DRINKAT QC — Completion report

**Environment:** staging only  
**Worker:** `drinkat-qc-staging` (`8d864ea4-221a-418a-b516-e86a7550c8d6`)  
**D1:** `drinkat-qc-staging` (`9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c`)  
**R2:** `drinkat-qc-staging-uploads`  
**Production worker / D1 / R2:** untouched  
**iOS bundle:** `com.bmtechs.drinkat` (unchanged)  
**Native UA:** `DrinkatHR-Native` (unchanged)

Status labels used below: **IMPLEMENTED** · **TESTED** · **MOCKED** · **BLOCKED** · **NOT IMPLEMENTED**

---

## 1. Completed feature inventory

| Feature | Status |
| --- | --- |
| Phase 1 foundation (auth, permissions, form engine, version pin, HR/chat freeze) | IMPLEMENTED / TESTED (accepted) |
| Staging `currentVersionId` → published v2 (3 live fields); historical `stg_hist_sub_1` stays on v1 | IMPLEMENTED / TESTED |
| Unauthenticated API 307 redirects documented; middleware not rewritten | IMPLEMENTED / TESTED |
| Seven QC inspection domains + opening/closing templates, sections, scoring, evidence, severity | IMPLEMENTED / TESTED |
| Immutable template versions, publish, preview, history UI | IMPLEMENTED / TESTED |
| Inspection scheduling (Asia/Amman), idempotent generation, task states | IMPLEMENTED / TESTED (staging only) |
| My Tasks Today + guided inspection (sections, camera upload, draft, submit, EN/AR) | IMPLEMENTED / TESTED (API journey + UI shipped) |
| Issue lifecycle FAIL→…→CLOSED, reopen, after photo, Owner/QC verify only | IMPLEMENTED / TESTED |
| Configurable escalation rules (unapproved staging defaults) | IMPLEMENTED / TESTED |
| Deterministic KPI engine, versioned weights, shadow mode, explanations | IMPLEMENTED / TESTED (golden unit + staging `/api/kpi/me`) |
| Official KPI publication | BLOCKED until two approved monthly shadow cycles |
| AI photo QC / brief / SOP / product ref / coaching adapter | IMPLEMENTED / MOCKED |
| Live AI provider | BLOCKED (no `AI_API_KEY` + `AI_PROVIDER`; no approved SOP corpus) |
| Role dashboards + CSV overview export | IMPLEMENTED / TESTED (API) |
| Production deploy | NOT IMPLEMENTED (forbidden) |

---

## 2. Architecture summary

Existing stack preserved: Next.js 15, React 18, OpenNext Workers, Prisma 5 WASM, D1, R2, NextAuth, Capacitor iOS, push, EN/AR + RTL, centralized permissions, `ManagementFormTemplate` engine.

New ops layer sits on that engine:

- Templates → immutable `FormTemplateVersion`
- Active `InspectionSchedule` + env `INSPECTION_SCHEDULER_ENABLED=1` → `InspectionTask`
- Submit → pinned submission + `Issue` per failed answer (`sourceAnswerId` unique)
- KPI reads pinned answers / tasks / issues only; AI never writes scores
- AI adapter logs `AiRun` and always labels mock vs live

Scheduler is double-gated: env flag **and** `schedule.active`. Production `wrangler.jsonc` does not set the flag.

---

## 3. Database migration report

| Migration | Target | Kind |
| --- | --- | --- |
| `0016_qc_phase1_versioning.sql` | staging (already applied) | Additive |
| `0017_qc_ops.sql` | **staging only** | Additive (`ADD COLUMN`, `CREATE TABLE`, `INSERT OR IGNORE` config) |

`npm run db:d1:migrate:qc-ops:remote` **REFUSES** production.  
No drops, no historical deletes. Production D1 was not opened.

New tables: `IssueEvent`, `IssueComment`, `EscalationRule`, `KpiWeightConfig`, `KpiPeriodScore`, `ResponsibilityDecision`, `AiRun`, `QcAppConfig`.  
Extended: `InspectionSchedule` (`window`, `label`), `InspectionTask` (draft/submit timestamps), `Issue` (trace fields).

---

## 4. API and permission coverage

New routes are registered in `API_ROUTE_POLICIES` (83 routes; disk = registry).

| Route | Gate |
| --- | --- |
| `GET /api/forms/templates/[id]/versions` | session |
| `GET /api/inspections/tasks` | session (self / branch / org) |
| `GET/POST .../tasks/[id]`, start, draft, submit | session / `inspections:run` + assignee |
| `GET /api/issues`, `GET/PATCH /api/issues/[id]` | staff/marketing 403; AM/manager branch; Owner/QC org |
| `GET/POST /api/escalation-rules` | owner |
| `GET /api/kpi/me` | `kpi:viewOwn` |
| `GET /api/kpi/branch` | `kpi:viewBranch` |
| `GET/POST /api/kpi/weights` | owner |
| `POST /api/ai/run` | `ai:use` |
| `GET /api/qc/overview` | session (CSV needs reports/manager/qc) |

AM remains non-manager: `inspections:run`, `issues:update`, `kpi:viewOwn` — not `inspections:viewBranch`.  
Managers cannot verify/close issues. Owner/QC only.

---

## 5. KPI formula verification

Unit golden tests in `scripts/test-qc-ops.ts`:

- Zero evidence → **Not Rated**, never 100%
- 1–9 timeliness samples → **Provisional**
- ≥10 → **Scored**
- Recurring issues omitted without approved `employee_error`
- With approved attribution: `repeat 2 / exposure 10` → 80
- Critical SLA: 2 within + 2 overdue unresolved → 50
- Provisional components excluded from weighted total (renormalize)
- Official publication: `officialKpiAllowed(0|1)=false`, `(2)=true`

Weights match `docs/KPI_SPECIFICATION.md`. Stored scores are **shadow** only. `official_kpi_cycles_completed=0`.

---

## 6. AI integration status

| Feature | Status |
| --- | --- |
| Provider adapter (`src/lib/ai-provider.ts`) | IMPLEMENTED |
| Photo QC | MOCKED — suggests only; human confirms |
| Daily brief | MOCKED — facts from DB counts only |
| SOP assistant | MOCKED — states approved SOP content is unavailable |
| Product reference | MOCKED — visible presentation only; no temperature claims |
| Coaching | MOCKED — no invented performance problems |
| Live activation | BLOCKED — credentials and approved SOP corpus required; spend not authorized |

Responses include `AI-GENERATED (MOCK)` and `AI SUGGESTS. HUMAN CONFIRMS.`

---

## 7. Staging test results

**Unit:** `verify:phase1` + `verify:qc-ops` pass.

**Staging HTTP (`npm run verify:staging-http`): 44/44**

Includes:

- Documented unauthenticated **307** (middleware unchanged)
- Historical v1 render; live published version = 3 fields
- Staff issues 403; AM issues 200; staff branch KPI 403
- Cron scheduler **on in staging**
- Journey: start → fail submit → 3 issues → manager ack/fix → manager verify **400** → QC verify/close **200**
- Staff B cannot see Staff A task ids
- AI SOP mock labeled

**Production:** not deployed, not migrated, scheduler env absent.

---

## 8. Remaining business decisions

1. Approve or replace staging escalation SLA hours (4 / 24 / 72 / 168). These are **not** food-safety thresholds (`escalation_defaults_approved=0`).
2. Complete **two monthly shadow KPI cycles** and explicitly approve official publication.
3. Confirm duty-roster attribution for Assistant Manager (today: whole-branch provisional).
4. Approve a live AI provider, budget, and rate limits.
5. Load approved SOP documents before enabling the SOP assistant.
6. Confirm whether opening/closing should also assign to managers/AM (currently `role=staff`).
7. Whether unauthenticated APIs should stay 307 or move to JSON 401.

---

## 9. Known limitations

- Guided inspection offline is draft-on-server only; no IndexedDB queue.
- After-photo in the automated journey used a path string; real camera→R2 is the existing `/api/upload` pipeline and was not visually confirmed on a physical iPhone in this run.
- KPI `team_improvement` is **Not Rated** until a prior official period exists.
- `createMany`/`skipDuplicates` is unreliable on D1; generation uses per-row insert + unique catch.
- Legacy checklist reminders still run; inspection generation is a separate table (no duplicate inspection tasks from checklists).
- Mocked AI is **not** production-ready.

---

## 10. Production readiness assessment

**Not production-ready.**

Evidence: official KPI blocked; AI mocked; escalation SLAs unapproved; only one staging monthly period of synthetic data; no App Store / production deploy; two shadow cycles not completed.

Staging is suitable for operational walkthroughs and further validation.

---

## 11. Production deployment checklist (do not execute until authorized)

1. Two complete monthly KPI shadow cycles reviewed and approved.
2. Escalation SLAs approved in writing; set `escalation_defaults_approved=1`.
3. AI: approved provider, secrets **not** copied from production casually, SOP corpus loaded, cost cap.
4. Additive migrate `0017` to production D1 **only after** explicit production authorization (current scripts refuse).
5. Deploy Worker `drinkat-management` **without** `INSPECTION_SCHEDULER_ENABLED` until a separate scheduling go-live.
6. Confirm production cron still does not generate inspection tasks until that go-live.
7. Do not reuse staging secrets; do not send test pushes to production users.
8. Keep `com.bmtechs.drinkat` and `DrinkatHR-Native`.
9. Smoke: login all roles, one real inspection, one issue close, R2 photo, iOS push.
10. Rollback plan: Worker version pin; D1 additive-only (no drop).
