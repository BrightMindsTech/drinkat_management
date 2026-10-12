# DRINKAT QC — Phase 2 design (confirmed, not implemented)

This document satisfies Gate 5. **Do not implement 2A–2D until Phase 2 is authorized.**

## Confirmed rules

### Inspection assignment
- Tasks are generated from `InspectionSchedule` against a **pinned** `FormTemplateVersion` (never the live mutable catalog row).
- Scope is explicit: branch and/or employee and/or role. Assistant Manager is **not** treated as Branch Manager.
- Legacy `Checklist` / `ChecklistAssignment` generation is **not** used for new work. Existing checklist history stays readable until backfill. Dual generation is forbidden.

### Scheduling and overdue
- Recurrence starts as daily (Amman calendar `periodKey`).
- `dueAt` = that day’s `deadlineTime`.
- Cron (when activated) marks `scheduled` → `missed` after `dueAt` if not submitted.
- Excused requires a logged manager/QC action.

### Duplicate prevention
- `InspectionTask` unique `(scheduleId, assigneeEmployeeId, periodKey)`.
- Inserts use skip-duplicates / ON CONFLICT ignore.
- `Issue` unique `sourceAnswerId` — one issue per failed answer.

### Failed-answer issue creation
- A visible required answer that fails `passValues` (or critical flag) creates an Issue.
- Conditional hidden questions cannot create issues.
- Creation is transactional with the inspection run commit.

### Responsibility and ownership
- Inspection result, severity, responsibility, and KPI impact stay four separate records.
- Default assignee: branch manager of the run’s branch (not Assistant Manager unless later duty roster says so).
- Responsibility is **suggested**, then **approved**, before any individual KPI effect (KPI engine itself is not in Phase 2).

### Before/after evidence
- Failed items that require photo evidence require a before photo on fail and an after photo on `fixed`.
- Camera-only capture (`capture="environment"`) and existing R2 upload pipeline.

### QC-only verification
- `verified` and `closed` transitions: Owner or QC Manager only (`qc:review`).
- Branch Manager / Assistant Manager / Staff cannot self-verify.

### Rejected-correction workflow
- `fixed` → verification fail → `reopened` → `in_progress`.
- Reopen count is stored on the issue. Staff resubmits after photos.

### Escalation
- Recipients are **configurable** (role and/or user ids per severity).
- SLA hours per severity are **configurable**. No food-safety times are hardcoded.

### Legacy checklists
- New scheduler ignores `Checklist` rows.
- A feature flag / `InspectionSchedule.active` (default false) is the only activation switch.
- Do not copy cron of old QC submit reminders onto both systems for the same person/day.

## Implementation order (when authorized)

2A. Versioned inspection templates (already started in Phase 1; extend runner metadata).  
2B. Scheduling + My Tasks Today (activate generation).  
2C. Guided inspection runner.  
2D. Issue lifecycle and QC verification.
