# DRINKAT QC — Production migration runbook

**DO NOT EXECUTE this runbook until the owner writes an explicit production authorization.**

This document is a rehearsal checklist. Worker rollback does **not** undo D1 migrations.

## Isolation

| Resource | Production (forbidden here) | Staging (authorized) |
| --- | --- | --- |
| Worker | `drinkat-management` | `drinkat-qc-staging` |
| D1 | `drinkat-management` (`d890068e-dccb-422d-b19d-2e40928b30df`) | `drinkat-qc-staging` (`9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c`) |
| R2 | `drinkat-management-uploads` | `drinkat-qc-staging-uploads` |

Current npm scripts **refuse** production for 0016–0020 (`db:d1:migrate:*:remote` exits 1).

## Pending additive migrations (if production is ever authorized)

Apply only what production does not already have. Inspect `sqlite_master` first.

1. `prisma/migrations/0016_qc_phase1_versioning.sql`
2. `prisma/migrations/0017_qc_ops.sql`
3. `prisma/migrations/0018_ai_real.sql`
4. `prisma/migrations/0019_prod_hardening.sql`
5. `prisma/migrations/0020_sop_review.sql` — SOP review columns only; does **not** approve any document
6. `prisma/migrations/0021_jordan_kpi_hr.sql` — `User.hrKpiReviewer`, SOP adopt/approve audit columns, `KpiHrReview`. Does **not** approve SOP rows or delete history.

All five are additive (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN`, indexes). None contain `DROP TABLE`, `DROP COLUMN`, or historical `DELETE`.

## Preflight

1. Confirm written owner authorization naming production Worker + D1.
2. Confirm iOS bundle remains `com.bmtechs.drinkat` and native UA `DrinkatHR-Native`.
3. Confirm production `wrangler.jsonc` still **omits** `INSPECTION_SCHEDULER_ENABLED` and `AI_PAID_USAGE_APPROVED`.
4. Confirm official KPI stays blocked (`official_kpi_cycles_completed` < 2 and `official_kpi_publication_approved` ≠ 1) unless the owner separately approves publication.
5. Confirm a production `NEXTAUTH_SECRET` already exists (app now refuses the hardcoded fallback on the production host).
6. Do not copy staging OpenAI secrets into production.
7. Snapshot / export production D1 (Cloudflare D1 backup / `wrangler d1 export`) and store the file off-box.
8. Record current production Worker version ID for rollback.

## Backup / restore rehearsal (do this on staging first)

```
# Staging rehearsal only
npx wrangler d1 export drinkat-qc-staging --remote --config wrangler.staging.jsonc --output=/tmp/drinkat-qc-staging-backup.sql
```

Restore rehearsal: apply the export to a **new throwaway D1 database**, not production. Confirm table counts for `ManagementFormSubmission`, `FormTemplateVersion`, `InspectionTask`, `Issue`.

## Production apply order (future; do not run now)

1. Enable Cloudflare D1 backup / export immediately before migrate.
2. Apply 0016 → verify `FormTemplateVersion` row count ≥ historical templates.
3. Apply 0017 → verify `Issue`, `KpiPeriodScore`, `QcAppConfig` exist; `InspectionSchedule.active` default remains dormant (0).
4. Apply 0018 → verify `SopDocument` empty or approved-only as intended.
5. Apply 0019 → verify `UploadObject` exists; `InspectionTask.lastRemindedAt` and `Issue.lastEscalatedAt` nullable.
6. Apply 0020 → verify `SopDocument.qcDomain` / `reviewStatus` exist; `SELECT COUNT(*) FROM SopDocument WHERE approved = 1` is 0 unless owner-signed documents were ingested later.
7. Deploy Worker **without** turning on the scheduler or paid AI flags.
7. Smoke: login owner/qc/manager/AM/staff; open one historical submission; confirm it still renders pinned fields.

Suggested verification queries (D1 console, after migrate):

```sql
SELECT COUNT(*) AS versions FROM FormTemplateVersion;
SELECT COUNT(*) AS submissions FROM ManagementFormSubmission;
SELECT COUNT(*) AS hist_null_version FROM ManagementFormSubmission WHERE templateVersionId IS NULL;
SELECT COUNT(*) AS schedules_active FROM InspectionSchedule WHERE active = 1;
SELECT key, value FROM QcAppConfig;
SELECT COUNT(*) AS approved_sops FROM SopDocument WHERE approved = 1;
```

`schedules_active` may be > 0 if someone activated rows. Generation still requires `INSPECTION_SCHEDULER_ENABLED=1`, which production must not set.

## Application compatibility

- Old Workers can run after additive columns (unused columns are ignored).
- New Workers that read `UploadObject` / `lastRemindedAt` **must not** deploy to production before 0019 is applied.
- Therefore: migrate first, then deploy, never the reverse for 0019.

## Rollback

| Layer | Action |
| --- | --- |
| Worker | Pin previous Worker version in Cloudflare. Does not undo SQL. |
| D1 | Restore from the pre-migrate export onto the production database **only** if the owner accepts data loss of rows written after the export. There is no column-level rollback. |
| R2 | Objects are not deleted by these migrations. |
| Secrets | Do not rotate/delete production secrets as part of rollback unless compromise is confirmed. |

## Failure response

1. Stop deploying.
2. Leave production scheduler and AI flags off.
3. Restore Worker version.
4. If migrate partially applied, do **not** DROP new tables to “undo”; the additive schema is forward-compatible. Restore from backup only if the database is corrupt.
5. Record the failed command, D1 error, and Worker version in the incident note.

## Explicitly out of scope until later authorization

- App Store submission
- Production cron inspection generation
- Production OpenAI
- Official KPI publication
- Historical deletes
