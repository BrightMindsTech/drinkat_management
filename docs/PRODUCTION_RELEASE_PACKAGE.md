# DRINKAT QC — Production release package

**DO NOT EXECUTE.** This is a rehearsal package for the owner’s GO/NO-GO.  
Production Worker `drinkat-management`, D1 `d890068e-dccb-422d-b19d-2e40928b30df`, and R2 `drinkat-management-uploads` were not modified.

Companion: `docs/PRODUCTION_MIGRATION_RUNBOOK.md`.

## 1. Feature inventory

Auth/roles (AM ≠ manager), immutable form versions, seven QC domains, opening/closing as scheduled inspections, scheduler (double-gated), guided inspection + fail→issues, issue lifecycle (Owner/QC verify), KPI engine (shadow), real OpenAI on staging only, SOP draft library (unapproved), dashboards EN/AR/RTL, R2 uploads with ACL, push inbox + retry.

Not included: official KPI publication, approved SOP answers, production AI, production scheduler, App Store submission.

## 2. Final database schema

Prisma 5.22.0 `prisma/schema.prisma`. QC additions: `FormTemplateVersion`, `InspectionSchedule`, `InspectionTask`, `Issue*`, `KpiPeriodScore`, `QcAppConfig`, `SopDocument` (+ `qcDomain`, `reviewStatus`, review audit), `UploadObject`, `AiUsageLog`.

## 3. Migration sequence (future production only)

0016 → 0017 → 0018 → 0019 → 0020. All additive. Scripts `db:d1:migrate:*:remote` refuse production.

## 4–5. Backup and restore rehearsal

**Staging export (this pass):** `wrangler d1 export drinkat-qc-staging --remote --config wrangler.staging.jsonc --output=/tmp/drinkat-qc-staging-backup.sql` — 727 SQL lines, off-repo.

Live counts at export (staging D1 only): submissions 5, versions 12, tasks 18, issues 11, SOP rows 20, **approved_sops 0**.

Restore rehearsal: apply that export to a **new throwaway D1**, never production. A throwaway restore was not created in this pass (would provision a new Cloudflare D1). Worker rollback does **not** undo SQL.

Worker rollback does **not** undo SQL.

## 6. Production environment requirements

Same stack: Next.js 15, React 18, OpenNext Workers, Prisma 5 WASM, D1, R2, NextAuth, Capacitor iOS. Production `wrangler.jsonc` must omit `INSPECTION_SCHEDULER_ENABLED` and `AI_PAID_USAGE_APPROVED` until separately authorized.

## 7. Secrets checklist

| Secret | Production rule |
| --- | --- |
| `NEXTAUTH_SECRET` | Required; app fail-fasts on production host if missing |
| `NEXTAUTH_URL` | Production hostname only |
| `CRON_SECRET` | Distinct from staging |
| `OPENAI_API_KEY` | Do **not** copy staging key. Production AI stays off until owner spend approval |
| Push VAPID | Existing production pair; do not rotate in this package |

## 8. Worker configuration checklist

- Name: `drinkat-management`
- D1 + R2 bindings unchanged
- No scheduler flag, no `AI_PAID_USAGE_APPROVED`
- iOS bundle / UA unchanged

## 9. R2 access verification

Staging: uploads go to `drinkat-qc-staging-uploads`; GET requires session + `actorCanReadUpload`; `Cache-Control: private, no-store`.  
Production: repeat the same ACL after migrate 0019 creates `UploadObject`. Do not make the bucket public.

## 10. Scheduler activation procedure

1. Owner written authorization.  
2. Confirm `InspectionSchedule.active` intended rows.  
3. Set `INSPECTION_SCHEDULER_ENABLED=1` on production Worker **after** migrate.  
4. Watch unique `(scheduleId, assigneeEmployeeId, periodKey)` — no silent backfill of historical periods.

Until then: leave the flag unset.

## 11. AI activation procedure

1. New production OpenAI project/key and spend cap.  
2. `AI_PROVIDER=openai` + `AI_PAID_USAGE_APPROVED=1` only after written spend approval.  
3. SOP assistant remains blocked until approved DRINKAT documents exist.  
4. Fail-closed: no mocks.

## 12. KPI shadow-mode configuration

`kpi-compute.ts` hardcodes `effectiveStoreMode = 'shadow'`. Official publication also requires `official_kpi_cycles_completed >= 2` and `official_kpi_publication_approved=1`. Do not fabricate cycles.

## 13. App Store / TestFlight checklist

See `docs/IPHONE_ACCEPTANCE_CHECKLIST.md`. Physical device **BLOCKED** this pass. Bundle must remain `com.bmtechs.drinkat`.

## 14. Smoke tests (after a future production deploy)

Login all six roles. Historical submission still shows pinned v1 fields. Staff cannot see other-branch tasks. SOP assistant `sop_unavailable` unless approved docs exist. KPI page says shadow. Uploads 403 on foreign keys.

## 15. Rollback

Pin previous Worker version ID. D1: restore from pre-migrate export only. Do not DROP 0016–0020 columns to “undo.”

## 16. Emergency response

| Event | Action |
| --- | --- |
| Bad Worker | Rollback Worker version |
| Bad migration | Stop deploys; restore D1 from export; do not DROP |
| AI spend spike | Unset `AI_PAID_USAGE_APPROVED`; rotate the **production** key only if owner asks |
| Auth incident | Rotate `NEXTAUTH_SECRET` after owner approval; sessions will invalidate |
| Accidental official KPI | Keep `effectiveStoreMode` shadow; unset publication flag |
