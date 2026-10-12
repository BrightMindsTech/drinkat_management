# DRINKAT QC — Production readiness report

**Date:** 2026-10-10  
**Environment audited / hardened:** staging only  
**Staging Worker:** `drinkat-qc-staging` version `b16fb626-edb1-4363-b67c-45e6e7f6024c`  
**Staging D1:** `9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c` (migration `0019_prod_hardening.sql` applied)  
**Staging R2:** `drinkat-qc-staging-uploads`  
**Production Worker / D1 / R2:** untouched  
**iOS bundle:** `com.bmtechs.drinkat` (unchanged)  
**Native UA:** `DrinkatHR-Native` (unchanged)

**Final recommendation: NO-GO for production.**

Technical P0/P1 defects found in this audit were fixed and retested on staging. Mandatory business and external gates are still open.

See also: `docs/PRODUCTION_READINESS_AUDIT.md`, `docs/PRODUCTION_MIGRATION_RUNBOOK.md`.

---

## 1. Executive summary

The QC product is substantially implemented on the existing stack (Next.js 15, React 18, OpenNext Workers, Prisma 5 WASM, D1, R2, NextAuth, Capacitor iOS). This pass did not rebuild it.

What changed: upload authorization, atomic inspection submit, opening/closing removed from the Forms catalog, KPI evidence assembly aligned to `docs/KPI_SPECIFICATION.md`, escalation/reminder dedupe, SOP ingest for unapproved synthetic documents only, and UI hardening (verify buttons, voice confirm, Arabic labels).

What did not change: production isolation, official KPI block, fail-closed real OpenAI on staging, SOP answers still unavailable without approved DRINKAT documents.

---

## 2. Completed features

| Subsystem | Code exists | Tests passed | Operationally validated | Status |
| --- | --- | --- | --- | --- |
| Auth / permissions / AM ≠ manager | Yes | Phase 1 + staging 52/52 | Staging HTTP | IMPLEMENTED / TESTED |
| Form engine + immutable versions + historical pin | Yes | Phase 1 + staging hist v1 | Staging HTTP | IMPLEMENTED / TESTED |
| Seven QC domains + opening/closing | Yes | Unit + staging catalog | Staging task list UI | IMPLEMENTED / TESTED |
| Scheduler (Asia/Amman, unique task key, double gate) | Yes | Unit + staging cron 200 | Staging only | IMPLEMENTED / TESTED |
| Guided inspection + fail → issues | Yes | Staging journey | API yes; camera UI not on device | IMPLEMENTED / TESTED (API) |
| Issue lifecycle, manager cannot verify | Yes | Staging + unit | Issue detail UI (owner) | IMPLEMENTED / TESTED |
| KPI engine + compute (shadow) | Yes | Golden + compute helpers | `/dashboard/kpi` shadow copy | IMPLEMENTED / TESTED |
| Official KPI publication | Gated | `officialKpiAllowed(0\|1)=false` | Never enabled | BLOCKED |
| Real AI photo/brief/coaching/product/voice EN | Yes | Prior 8/8 live; status live today | Staging status live | IMPLEMENTED / TESTED |
| Voice AR spoken clip | Code yes | Not separately recorded | — | IMPLEMENTED / BLOCKED (clip) |
| SOP assistant answers | Retrieval only | 503 `sop_unavailable` | UI + HTTP | BLOCKED |
| SOP ingest (synthetic, unapproved) | Yes | Staging HTTP | Owner POST | IMPLEMENTED / TESTED |
| Role dashboards / CSV overview | Yes | Prior API | KPI/issues/tasks UI sampled | IMPLEMENTED / TESTED (API) |
| Upload object ACL | Yes | Staging 403 on foreign key | — | IMPLEMENTED / TESTED |
| Production deploy | No | Scripts refuse | — | NOT IMPLEMENTED |

---

## 3. Remaining defects

Open after this pass (not invented):

- Dual legacy `/dashboard/qc` checklists and new inspection tasks can both exist (business rule).
- AI rate limit is per-isolate (accepted residual).
- Photo QC suggestion is not a submit gate (human confirm remains copy + API flag).
- Template field labels remain English; mixed-script RTL titles look uneven.
- `client-error` is unauthenticated; `push/test` is any-session/self.
- Completed tasks still showed “Start inspection” on Worker `b16fb626` (repo now uses Preview for terminal statuses; not in that Worker).
- Physical iPhone camera → R2 not confirmed.

---

## 4. Security findings

Fixed this pass: upload IDOR, AI arbitrary image path, template-version visibility, public upload cache, production hardcoded NextAuth fallback, opening/closing form dual-path.

Retested: staff B vs staff A tasks; manager cannot verify; staff SOP ingest 403; unknown upload key 403; unauthenticated APIs still 307 (documented, not rewritten).

No remaining P0 authorization bugs were demonstrated. Residual P3 items listed above.

---

## 5. Performance results

No new infrastructure. Added indexes: `InspectionTask(status, dueAt)`, `Issue(assigneeEmployeeId)`, `UploadObject(objectKey, uploadedByUserId)`.

Staging HTTP journey (52 checks) completed in ~31s including logins. No demonstrated D1 timeout on current staging data. Large-history pagination is still “take 200” on issues — acceptable at current volume; not prematurely rewritten.

---

## 6. Database readiness

| Migration | Staging | Production |
| --- | --- | --- |
| 0016–0018 | Already applied | Not applied (scripts refuse) |
| 0019 | Applied 2026-10-10; 7 queries, additive | Not applied |

Historical `stg_hist_sub_1` still renders v1 fields after 0019. Runbook: `docs/PRODUCTION_MIGRATION_RUNBOOK.md`. Do not execute it.

---

## 7. AI validation results

| Check | Result |
| --- | --- |
| Staging `GET /api/ai/status` | live |
| SOP `POST /api/ai/run` | 503 `sop_unavailable`, `mocked: false` |
| Synthetic ingest `SYNTHETIC:` + `approved:true` | 400 |
| Synthetic ingest unapproved | 200, `approved: false` |
| Prior live OpenAI 8/8 | Still the last paid vision/whisper evidence; not re-run this pass (bounded spend) |

Human confirmation copy is on the AI screen. Voice language selector is present. No user-facing mocks.

---

## 8. KPI validation results

Pure engine golden tests still pass (zero evidence ≠ 100%; official requires 2 cycles).

Compute-layer corrections now match the spec:

- Recurrence = same `questionKey` inside `repeat_issue_window_days` (default 14) on approved Employee Error.
- Staff EE gate is inspection-assignee attributed, not branch-wide.
- Checklist quality Scored uses **answer count ≥ 20**.
- Critical SLA includes pre-period overdue open criticals.
- Corrective on-time uses configured escalation SLA hours (still unapproved as food-safety).
- Store mode remains `shadow`. `officialPublicationAllowed` stays false.

AM attribution still flagged `provisional_whole_branch`.

---

## 9. Mobile validation results

Browser, staging, Arabic RTL:

- 390×844: tasks list (7 domains + opening/closing), issue detail, AI, KPI shadow note.
- 320×568: AI screen (voice language, human-confirm, SOP).
- Owner issue detail showed Verify/Close (correct). Arabic labels: قبل / تحقق / إغلاق.

Physical iPhone: **BLOCKED**. Desktop/mobile emulation is not iOS validation. Bundle/UA unchanged in `capacitor.config.ts` and `ios/App/App/capacitor.config.json`.

---

## 10. Business approvals needed

1. Approved DRINKAT SOP documents (`SopDocument.approved=1`, real `sourceRef`, not `SYNTHETIC:`).
2. Two monthly shadow KPI cycles, then explicit `official_kpi_publication_approved`.
3. Escalation hours 4/24/72/168 (or replacements) in writing; `escalation_defaults_approved=1`.
4. AM duty-roster attribution vs keep provisional whole-branch.
5. Whether opening/closing also assign to managers/AM (seed is `role=staff`).
6. Separate written production authorization (Worker + D1 + secrets). Do not copy staging OpenAI into production.
7. App Store / TestFlight when physical iOS is accepted.

---

## 11. Known limitations

- Guided inspection offline = server draft only.
- Legacy checklist engine still present.
- Unauthenticated API 307 documented.
- Voice transcript saves on the AI screen after confirm; it is not written into an inspection answer unless the user copies it.
- Upload ACL: brand-new files require `UploadObject` (created on upload). Legacy blobs remain readable if referenced by an accessible issue/submission.

---

## 12. Release blockers

**Technical (remaining):** none demonstrated at P0 after this pass. Physical device and paid Arabic voice clip are external, not code defects.

**Business:** SOP corpus, two KPI cycles, escalation approval, production authorization.

**External:** physical iPhone, App Store, owner-supplied SOP text.

---

## 13. Production deployment runbook

See `docs/PRODUCTION_MIGRATION_RUNBOOK.md`. **Do not execute.**

---

## 14. Rollback and recovery

Worker: pin previous version. D1: restore from pre-migrate export only; Worker rollback does not undo SQL. 0016–0019 are additive — do not DROP to “undo.”

---

## 15. Final recommendation

**NO-GO.**

Staging is suitable for owner walkthroughs and further operational validation. Production is not authorized and would still fail Gate H (approvals) plus physical iOS.
