# DRINKAT QC — FINAL RELEASE READINESS REPORT

**Date:** 2026-10-10  
**Staging Worker:** `drinkat-qc-staging` version `269e1373-6c0b-44a9-bc7d-904246190f75`  
**Staging D1:** `9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c` (0021 applied)  
**Production Worker / D1 / R2:** not modified  
**iOS:** `com.bmtechs.drinkat` / `DrinkatHR-Native` unchanged

**Recommendation: NO-GO for production.**

Owner authorized *preparation* and *conditional* deploy. Mandatory gates below are not all green. Production migration/deployment was **not** executed.

---

## Binding business decisions (implemented on staging)

1. **Jordan + FDA:** FDA Food Code 2026 is the internal baseline. It is not Jordanian law. JFDA / Food Law No. 30 of 2015 takes precedence. Review: `docs/JORDAN_FOOD_SAFETY_REVIEW.md`. FDA drafts are **not** auto-approved.
2. **KPI purpose:** Operational indicators for internal HR review only. Not salary, bonus, discipline, promotion, or termination. HR comments/flags/completes; cannot overwrite calculated totals.
3. **Real KPI display:** Two-cycle shadow prerequisite removed for **display**. Mode is `operational`. Employment-decision use stays `false`. AM individual scores stay unpublished (`provisional_whole_branch`) until a duty roster exists.
4. **HR reviewer:** Owner has `kpi:hrReview`. Others only if Owner sets `User.hrKpiReviewer`. Payroll/leave/advances remain frozen.

---

## Release gates

| Gate | Result |
| --- | --- |
| No unresolved critical security defects demonstrated | **PASS** (staging HTTP 62/62; prior ACL fixes held) |
| Staging operational workflows (task→issue→QC close) | **PASS** |
| Controlled SOP adopt/approve; SYNTHETIC blocked; assistant uses approved only | **PASS** (draft approve 400; adopt unapproved; early approve 400; `sop_unavailable`) |
| Operational KPI + HR review permissions | **PASS** (staff 403 HR; owner 200; employmentDecisionUse false) |
| Real OpenAI, no mocks | **PASS** (prior live suite; SOP still fail-closed) |
| Database backup of **production** D1 | **FAIL** — not executed (would touch production) |
| Restore rehearsal into a new throwaway D1 | **FAIL** — staging export exists (`/tmp/drinkat-qc-staging-backup.sql`); throwaway DB not provisioned |
| Physical iOS acceptance | **FAIL / BLOCKED** |
| Authenticated browser walkthrough of all roles | **PARTIAL** — login AR/RTL sampled; full logged-in browser password not used; HTTP covers the journey |
| KPI scoring policy signed by owner (this document is the draft) | **FAIL** — needs explicit acceptance record |
| Escalation hours / food-safety house rules confirmed | **FAIL** — 4/24/72/168 still unapproved examples; Jordan gaps still need QC retrieval of JFDA PDFs |
| Production OpenAI secret + spend cap (not copied from staging) | **FAIL** — not configured |
| Production scheduler acceptance | **FAIL** — must stay off until assignments/escalation accepted |
| Rollback Worker version recorded for production | **FAIL** — production not opened |

**Failed mandatory gates → STOP. NO-GO.**

---

## Remaining actions (exact)

1. Physical iPhone on `com.bmtechs.drinkat` — complete `docs/IPHONE_ACCEPTANCE_CHECKLIST.md`.
2. Owner writes production authorization naming Worker + D1, then **you** (not this agent, until asked) export production D1 and restore into a **new** throwaway D1.
3. Apply 0016–0021 on production only after that backup verifies.
4. Configure a **new** production OpenAI key and spend limit. Do not copy staging.
5. Keep `INSPECTION_SCHEDULER_ENABLED` and `AI_PAID_USAGE_APPROVED` unset on production until accepted.
6. Sign escalation SLAs and which FDA sections are house procedure after the Jordan gap review.
7. Assign HR KPI reviewers; do not treat operational scores as employment actions.
8. Two-person approve only `DRINKAT-ADOPTED:…` documents after QC review — never SYNTHETIC/DRAFT/FDA in place.
9. Approve AM duty roster before publishing individual AM scores.

---

## What was tested this pass

- Unit: fda-sop, jordan-kpi, phase1 permissions (90 routes), nav
- Staging HTTP **62/62**
- Migration 0021 on staging D1 only
- No production deploy

Payroll/leave/chat remain frozen. Historical records not deleted. iOS identifiers unchanged.

Companion docs: `docs/JORDAN_FOOD_SAFETY_REVIEW.md`, `docs/PRODUCTION_RELEASE_PACKAGE.md`, `docs/PRODUCTION_MIGRATION_RUNBOOK.md`, `docs/SOP_GOVERNANCE_AND_OPS_DECISIONS.md`.
