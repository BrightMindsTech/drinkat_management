# DRINKAT QC — Release readiness report

**Date:** 12 October 2026  
**Scope:** 1–3 photo limits, photo replacement, staging soak, production migrate-then-deploy, Sara operational flags  
**Git:** dirty `main` was **not** committed.

| Environment | Worker | URL | D1 | R2 | Worker version |
| --- | --- | --- | --- | --- | --- |
| Staging | `drinkat-qc-staging` | https://drinkat-qc-staging.technologiesbrightminds.workers.dev | `9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c` | `drinkat-qc-staging-uploads` | `e4dd59e2-a5c5-4b0b-b64e-2ebfc890348f` |
| Production | `drinkat-management` | https://drinkat-management.technologiesbrightminds.workers.dev | `d890068e-dccb-422d-b19d-2e40928b30df` | `drinkat-management-uploads` | **`b3b9ba34-ae6f-4727-8fbe-576a64205f62`** (previous `763f4393-357e-4032-8581-a0efa1247805`) |

Verdict: **production schema + compatible Worker are live**. Photo participation remains **OFF** for every production employee. Photo KPI remains **shadow**. Scheduler remains **off**. Owner/HR can now turn intended people on through existing controls. Physical iPhone and live 1/2/3-file submit/replace were **not** exercised.

---

## 1. Exact code changes

Owner 12 Oct 2026: minimum 1 photograph, maximum 3, including `branch_cleanliness_360`. 360 still means multiple views, not a panorama. One photograph is sufficient. Staff may replace or remove a slot before submit. QC makes one decision for the set.

| Layer | Change |
| --- | --- |
| Limits | `PHOTO_DEFAULT_MAX_PHOTOS=3`, `PHOTO_360_MIN_PHOTOS=1`, `PHOTO_360_MAX_PHOTOS=3`. `clampPhotoLimits` caps at 3. |
| Database | Additive `0025_photo_limits_1_3.sql`: all types `minPhotos=1` `maxPhotos=3`; 360 criteria wording; `PhotoUploadDiscard` + indexes. Historical migrations not edited. |
| API | Submit still atomic (load R2 before create, unique 409). Accepts 1–3 paths. `POST /api/upload/discard` for uncommitted actor-owned objects. Replace/remove disabled while `busy`. |
| Client | Per-slot replace (`replaceIndexRef`) overwrites the slot instead of appending. Remove drops the slot. Add until 3. Send enabled at ≥1. |
| AI | GPT-4o preserved. Prompt: one photograph is sufficient; do not fail only because fewer than three were sent; UNASSESSABLE when a criterion cannot be seen. Retry / timeout / empty-response handling unchanged. |
| Production auth | `DRINKAT_PRODUCTION_MIGRATE=1` + `scripts/apply-production-qc-migrations.ts`. npm `*:remote` refuse scripts were **not** deleted. |
| Sara grant | `GRANT_SARA_PRODUCTION=1` + `scripts/grant-sara-production.ts` uses `wrangler d1 execute --remote` (not local `getPlatformProxy`). |

---

## 2. Files modified (this QC pass)

| File | Why |
| --- | --- |
| `src/lib/photo-multi.ts` | 1–3 constants + clamp |
| `prisma/schema.prisma` | `maxPhotos` default 3; `PhotoUploadDiscard` |
| `prisma/migrations/0025_photo_limits_1_3.sql` | Additive 1–3 + discard table |
| `src/lib/photo-upload-discard.ts` | Auditable R2 + `UploadObject` cleanup |
| `src/app/api/upload/discard/route.ts` | Session discard API |
| `src/lib/permissions.ts` | `upload/discard` session |
| `src/app/api/photo-checks/route.ts` | 1–3 validation; `refTake=2`; atomic persist preserved |
| `src/lib/ai-provider.ts` | 1-photo-sufficient prompt; GPT-4o unchanged |
| `src/components/photo-check/PhotoTaskBoard.tsx` | Replace slot, remove, max 3, discard on cancel/fail, lock while busy |
| `src/components/photo-check/PhotoOpsPanel.tsx` | 1–3 Owner/HR copy |
| `src/locales/en.ts` / `src/locales/ar.ts` | Replace / 1–3 / 360 copy |
| `scripts/test-photo-check.ts` | 1–3, 0025, replace, discard, refuse scripts |
| `package.json` | staging 0025; `*:remote` still refuses; `db:d1:migrate:qc-prod`; backup-verify |
| `scripts/apply-production-qc-migrations.ts` | Env-gated additive 0016–0025 |
| `scripts/verify-production-d1-backup.ts` | Backup verify helper |
| `scripts/grant-sara-production.ts` | Remote D1 grant (fixed off local replica) |
| `docs/DRINKAT_QC_RELEASE_READINESS_2026-10-12.md` | This report |

Unrelated dirty/untracked files on `main` were not committed.

---

## 3. Tests executed

`npm run verify` during production `npm run deploy` — **pass**:

- `verify:prisma`, `verify:prisma-guardrails`, `verify:middleware`
- `verify:qc-scoring`, `verify:phase1` (permissions, nav, form-engine, acceptance-gates, polish)
- `verify:qc-ops`, `verify:hardening`, `verify:fda-sop`, `verify:drinkat-manual`
- `verify:jordan-kpi`, `verify:photo-check`

`next build` compiled. Post-deploy smoke: five consecutive `GET /api/health/ready` → `{ok:true,db:true}`.

Not run (by design): `staging-photo-submit.ts` / live 4th-photo POSTs (would insert operational rows); physical iPhone.

---

## 4. Staging results

Staging Worker already carried the 1–3 + replace UI (`e4dd59e2`). Re-verified 12 Oct 2026 as `stg-staff-a@qc-staging.local`:

- Home copy: “One to three photos per send. 360° is different views, not a panorama.”
- Photo board Night task (Upcoming, Asia/Amman afternoon): **0 of 3 photos**, “Add at least 1 photo, then send.”
- **Send to QC disabled** at 0 photos.
- **Take a photo** and **Choose from library** present.
- 360 copy: “One to three photos in one send is enough.”

Owner session `stg-owner@qc-staging.local` on `/dashboard/photo-ops`:

- Photo ON / Photo OFF controls present.
- Copy: staff send one to three photos; everyone starts OFF.
- No additional employee was turned ON.

Unverified on staging: picking a real file, replacing a thumbnail, submitting 1/2/3 images, QC swipe of a new multi-image set.

---

## 5. Backup verification

| Item | Evidence |
| --- | --- |
| Export | `.backups/drinkat-management-d1-2026-10-12.sql` (8.4 MB) |
| SHA-256 | `a06187b16a7a1d6be85a72fa82dda85f0e12dc64de91d7ba0c4061f93993ba35` |
| Restore | Local disposable SQLite `.backups/restore-check-2026-10-12.db` (9.6 MB) |
| Restore counts | Employee **27**, User **28**, PhotoCheckSubmission **3** |

A throwaway **Cloudflare** D1 restore was not used; local sqlite3 restore matched production baselines. Production D1 was not reset or replaced with staging.

---

## 6. Production migrations applied

Preflight: production already had 0016–0022. Missing PhotoCheckType / 0023 flags / 0024 images / 0025 discard.

Command: `DRINKAT_PRODUCTION_MIGRATE=1 npm run db:d1:migrate:qc-prod`

| Result | Value |
| --- | --- |
| Applied | `0023`, `0024`, `0025` |
| Skipped | `0016`–`0022` |
| Employees | 27 → **27** |
| Users | 28 → **28** |
| Photo ON | **0** |
| Photo submissions | **3** (unchanged) |
| Schedules | **0** |
| Types | 21, all `minPhotos=1` `maxPhotos=3`, including 360 |
| 360 / prep fridge | `active=0` |
| Freezer / الحاضنة types | **none** |
| `PHOTO_CHECK_SCHEDULER_ENABLED` in `wrangler.jsonc` | **absent** |

Identity mix after grant: owner 1, qc 3, manager 5, staff 16, marketing 3 (**28**).

---

## 7. Production deployment version

| Item | Value |
| --- | --- |
| Command | `npm run deploy` (verify → OpenNext build → wrangler deploy → post-deploy smoke) |
| Worker | `drinkat-management` |
| Version ID | **`b3b9ba34-ae6f-4727-8fbe-576a64205f62`** |
| Created | 2026-10-12T11:44:55.821Z |
| Previous | `763f4393-357e-4032-8581-a0efa1247805` (2026-10-10) |
| Bindings | D1 `drinkat-management`, R2 `drinkat-management-uploads` |
| AI vars | `AI_PROVIDER=openai`, `AI_VISION_MODEL=gpt-4o`, `AI_PAID_USAGE_APPROVED=1` |
| Scheduler | still not set |
| Health | `{ok:true,db:true}` × 5 |

Unauthenticated HTTP:

- `GET /login` 200 (email + password).
- `GET /dashboard` loads session restore, then “Sign in again” when no cookie (expected client-side gate).
- Photo/KPI/upload APIs **307** to `/api/auth/signin`.

Authenticated production login was **not** performed: no production account password is in the repo env files. Do not treat unauthenticated page HTML as an owner/QC session.

Native IDs unchanged: bundle `com.bmtechs.drinkat`, UA `DrinkatHR-Native`.

---

## 8. Sara permission verification

Identity confirmed before grant: `sara@drinkat.com`, `id=cmonciqrs001113pzp1hz8xaa`, `role=staff`.

First grant attempt via `getPlatformProxy` hit a **local** D1 replica without `photoOpsAdmin` and was aborted. Script was changed to `wrangler d1 execute --remote`. Then:

`GRANT_SARA_PRODUCTION=1 tsx scripts/grant-sara-production.ts`

| Field | Before | After |
| --- | --- | --- |
| role | staff | **staff** |
| photoOpsAdmin | 0 | **1** |
| qcReportsInbox | 0 | **1** |
| hrKpiReviewer | 0 | **0** |

Re-query after grant matched the same row. Payroll/HR reviewer flags were not granted. `npm run db:grant-sara:remote` still refuses (prints the explicit command).

Sara has not been logged into production in this pass (no password).

---

## 9. KPI activation status

| Key | Production |
| --- | --- |
| `kpi_mode` | **shadow** |
| `official_kpi_cycles_completed` | **0** |
| `photo_kpi_weights_approved` | **not set** |

Approved weights remain 20 / 15 / 15 / 15 in code, applied only when the flag is 1. Human QC remains final. Pending excluded from approval/quality. Rejected stay in quality denominator at 0. Approved UNASSESSABLE excluded. QC field reports do not call KPI compute. No historical backfill. **Payroll was not changed.**

---

## 10. Employee activation status

| Control | Production |
| --- | --- |
| `PhotoCheckEmployeeSetting.required=1` | **0** |
| Photo types `active` (360, prep fridge) | **0** |
| Photo schedules | **0** |
| Scheduler env | off |
| Bulk auto-enable | **not run** |

Owner/HR ON/OFF UI is in the deployed app. Staging owner session showed the controls. **No production employee was activated.** Intended staff must be turned on deliberately after this rollout.

---

## 11. Remaining issues and risks

| Item | Status |
| --- | --- |
| Live 1 / 2 / 3 file submit + replace + QC swipe of that set | UNVERIFIED (no file picker; production has no open photo tasks) |
| Cannot upload a 4th photo (API + UI) | Code/unit verified; live 4th-file attempt not made |
| Physical iPhone camera / library / UA / push | UNVERIFIED |
| Authenticated production owner/QC/Sara session | UNVERIFIED (no production passwords in env) |
| Backup restore on a throwaway Cloudflare D1 | Not done; local sqlite3 used |
| `getPlatformProxy({ remoteBindings: true })` | Hits local replica; production scripts must use `wrangler d1 execute --remote` |
| Night 360 still Upcoming until 18:00 Asia/Amman | Expected |
| Chest freezer / الحاضنة catalog | Still unapproved; 45 freezer photos not remapped |
| Photo KPI live scoring | Still shadow until `photo_kpi_weights_approved=1` **and** calculation equivalence is accepted |
| iOS `WKAppBoundDomains` | Production host only (unchanged) |
| Dirty git tree | Large unrelated QC work remains uncommitted |

---

## Phase gate record

| Gate | Result |
| --- | --- |
| A Staging 1–3 + replace + tests + deploy | PASS (UI 0-of-3 / Send disabled; live file replace UNVERIFIED) |
| B Backup + restore + schema inspect | PASS (local sqlite restore) |
| C Additive migrate + integrity | PASS (`0023`–`0025`, 27/28 preserved) |
| D Production Worker + smoke | PASS (version `b3b9ba34`; health; unauth API 307). Authenticated prod login UNVERIFIED |
| E Sara grant, KPI shadow, employees OFF | PASS |
| F Acceptance 1/2/3/not-4 + replace + QC set | PARTIAL — UI/API/DB yes; live camera/library/submit/QC of a new set no |

Production is **safe to operate** with existing HR/forms/QC history. Daily photo QC will start only after Owner/HR enable specific employees and (separately) the scheduler if task generation is wanted.

---

## Appendix — Final production completion (12 Oct 2026, later pass)

This section **appends** evidence. It does not replace the earlier staging/migrate/Sara record above.

**Production-only.** No staging deploy. No employee activation. No scheduler enable. No `photo_kpi_weights_approved=1`. No payroll change. Git not committed.

### A. Implementation summary

Defects found in the already-deployed 1–3 production app and fixed:

1. **Cancel during the final submit POST** could show a failure even after the server had saved the set. The client now treats HTTP 2xx as committed before cancel handling, and still never discards R2 objects referenced by a submission.
2. **QC swipe hid the AI recommendation** whenever `aiScore` was null (unavailable / unassessable). QC now always sees the AI verdict; score is optional.
3. **QC type title was English-only.** It now follows locale.
4. **Photo navigation** already had arrows (with `stopPropagation` so they do not swipe-decide). Dots were added as well.
5. **Staff tasks did not show approved observable criteria.** `criteriaJson` is now returned by `/api/photo-checks/tasks` and listed on the task card.
6. **Replace/remove/add slot logic** extracted to `applyPhotoSlotChange` so 1 / 2 / 3 / 4th-reject / replace-overwrite / remove are unit-tested without writing production rows.

GPT-4o, atomic load-before-create, 409 duplicates, discard safety, Owner/HR ON/OFF, Sara flags, and KPI shadow were preserved.

### B. Files changed this completion pass

| File | Why |
| --- | --- |
| `src/lib/photo-multi.ts` | `applyPhotoSlotChange` |
| `src/components/photo-check/PhotoTaskBoard.tsx` | committed-on-2xx; replace/remove via helper; show criteria |
| `src/components/photo-check/PhotoSwipeReview.tsx` | AI verdict always; bilingual title; dots |
| `src/app/api/photo-checks/tasks/route.ts` | return `criteriaJson` |
| `src/app/api/photo-checks/queue/route.ts` | return type `criteriaJson` |
| `src/locales/en.ts` / `src/locales/ar.ts` | `lookFor`, `aiAdvice` |
| `scripts/test-photo-check.ts` | slot, KPI pending, grant-remote, criteria |
| `scripts/grant-sara-production.ts` | comment only |
| `docs/DRINKAT_QC_RELEASE_READINESS_2026-10-12.md` | this appendix |

### C. Verification evidence

Commands:

- `npm run verify` (full suite during `npm run deploy`) — pass
- `npm run verify:photo-check` — pass (includes 1/2/3 add, 4th rejected, replace length stays 3, remove, pending KPI null approval/quality)
- `npm run verify:jordan-kpi` / `hardening` / `qc-ops` / `middleware` / `prisma-guardrails` / `fda-sop` / `drinkat-manual` / `phase1` — pass
- `next build` — compiled
- `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO` — **BUILD SUCCEEDED**, bundle `com.bmtechs.drinkat`
- Building the `.xcodeproj` without the workspace failed (`import Capacitor`) — expected; use the workspace
- No ESLint config; linting during build was not treated as a gate
- No production rows inserted. No notifications generated.

### D. Production environment (after this deploy)

| Item | Value |
| --- | --- |
| Worker | `drinkat-management` |
| Version | **`4bcee49b-3aca-46d6-9740-f3e5969282e1`** |
| Previous | `b3b9ba34-ae6f-4727-8fbe-576a64205f62` |
| URL | https://drinkat-management.technologiesbrightminds.workers.dev |
| D1 | `drinkat-management` / `d890068e-dccb-422d-b19d-2e40928b30df` |
| R2 | `drinkat-management-uploads` |
| Health | `{ok:true,db:true}` × 5 then again 200 after deploy |
| Login | 200 |
| Unauth photo-ops / queue | 307 sign-in |
| Employees | **27** |
| Users | **28** |
| Photo ON | **0** |
| Schedules | **0** |
| Types min/max | 1 / 3 |
| Sara | staff, photoOpsAdmin=1, qcReportsInbox=1, hrKpiReviewer=0 |
| KPI | `kpi_mode=shadow`, official cycles 0, weights flag **not set** |
| Scheduler env | still omitted from `wrangler.jsonc` |
| AI | `gpt-4o` |

No new database migration this pass.

### E. Workflow readiness

| Workflow | Result | Evidence |
| --- | --- | --- |
| One-photo submission | AUTOMATED PASS / live BLOCKED | `applyPhotoSlotChange` add to 1; API min=1. No production file submit (employees OFF, no credentials) |
| Two-photo submission | AUTOMATED PASS / live BLOCKED | add to 2; API accepts ≤3 |
| Three-photo submission | AUTOMATED PASS / live BLOCKED | add to 3 |
| Fourth-photo rejection | AUTOMATED PASS / live BLOCKED | add of 4th leaves `['a','b','c']`; API `clampPhotoLimits` max 3 |
| Photo replacement | AUTOMATED PASS / live BLOCKED | replace index 1 stays length 3; UI Replace control; discard skips referenced objects |
| QC review | AUTOMATED PASS / live BLOCKED | swipe + 409 + dots + AI verdict without score. Queue empty in production (no pending fabricated) |
| AI assessment | AUTOMATED PASS / live BLOCKED | GPT-4o config; empty/retry 1600; 1-photo-sufficient prompt; fail-safe pending_qc. No live vision call this pass |
| KPI shadow calculation | AUTOMATED PASS | weights 20/15/15/15 when gated on; production flag unset; pending approval/quality raw null; rejected denom 40; unassessable excluded |
| Owner operations | AUTOMATED PASS / authenticated prod BLOCKED | `requirePhotoOpsAdmin` owner bypass; ON/OFF APIs. No production owner password |
| Sara permissions | PASS (D1 + API gates) / session BLOCKED | D1 flags confirmed; APIs 307 without session; no Sara password |
| iOS native behavior | SIMULATOR COMPILE PASS / PHYSICAL NOT TESTED | workspace build succeeded; camera/library Info.plist present; UA/bundle unchanged; App Store not uploaded |

### F. Operational status

- Employees enabled: **no** (0 ON)
- Scheduler active: **no**
- Official photo KPI: **no** (shadow)
- Production employee notifications generated this pass: **no**

The owner can open production, sign in, use Owner/HR photo-ops, and turn on intended staff when ready. Daily tasks will appear only after types/schedules are configured and the scheduler is separately authorized.

### G. Remaining genuine blockers

1. **Owner login** — no production passwords in env. Authenticated production UI (photo-ops click, QC queue of real items) is blocked until the owner signs in.
2. **Deliberate employee ON** — required before real photo tasks exist. Do not bulk-enable everyone.
3. **Scheduler authorization** — production has 0 schedules and scheduler env off. Owner must authorize `PHOTO_CHECK_SCHEDULER_ENABLED=1` and approved schedule rows before automatic daily tasks.
4. **Physical iPhone** — camera, library, replace, backgrounding, session. Simulator compile is not a device pass. Do not App Store-upload from this pass.
5. **Live 1/2/3 file submit + QC swipe of that set** — requires (1)+(2) and real photographs. Not fabricated.
6. **Official photo KPI** — remains shadow until a new owner decision sets `photo_kpi_weights_approved=1`. Not payroll.

### H. Go-live statement

Infrastructure, schema 0023–0025, 1–3 validation, replacement logic, atomic submit, QC decision API, AI fail-safe, Sara flags, and Owner/HR controls are **deployed and technically verified**.

This is **ready for controlled activation**, not an automatically active daily photo workflow. Existing 27 employees / 28 users / 3 historical submissions are preserved.

---

## 12. 2026-10-12 evening — photo-ops ON/OFF, live KPI, timed tasks

Owner reported production ON/OFF timeouts, laggy photo-ops UI, shadow KPI, and missing tasks after enable.

| Item | Result |
| --- | --- |
| Worker | `a92e44f2-57ff-436d-b910-dee8d40a3c28` |
| Employees / users | **27 / 28** unchanged |
| Photo-ops UI | Single search + ON/OFF list. Client-side filter. Optimistic toggle. No per-type matrix. |
| ON/OFF API | One setting write; assign approved types in batch; generate remaining windows; OFF cancels open tasks only |
| Official program | 16 approved types active. 18 org-wide schedules (360 morning/midday/night; others 12:00–16:00 Asia/Amman). Provisional types stay inactive. |
| Scheduler | `PHOTO_CHECK_SCHEDULER_ENABLED=1`, read from Worker env at runtime (not Next build inline) |
| Photo ON | **17** (from owner toggles during the timeout bug). Assignments healed to approved types. Not a bulk auto-ON of everyone. |
| Tasks created this pass | **17** night 360 `due` (08:00–11:00 and 12:00–16:00 already passed; no backfill). Full set from tomorrow’s cron. |
| KPI | `kpi_mode=operational`, `photo_kpi_weights_approved=1`. Photo submission/consistency/approval/quality weights live. Not payroll. |
| Sara | staff, photoOpsAdmin=1 |
| Payroll | unchanged |

Authenticated owner click-through of the new list was not done (no production password in env). Physical iPhone still unverified.
