# DRINKAT QC — KPI specification (Phase 1 documentation)

This document is the Phase 1 correction of the KPI design. **The KPI engine is not implemented in Phase 1.** Formulas here supersede the earlier audit draft.

Weights remain those in the product proposal and must be stored in versioned `KpiWeightConfig` (Owner-only edits; QC may propose). Official period: **monthly**. Progress view: **weekly**. Repeat-issue window: **14 days, configurable**. Shadow mode: **two complete monthly cycles** before any publication.

AI cannot approve inspections or write KPI values.

## Status of a component

Every component in a period is one of:

| Status | Meaning |
| --- | --- |
| **Scored** | Minimum evidence met; value enters the weighted total. |
| **Provisional** | Some evidence exists but below the minimum sample. Shown for coaching only; **does not** enter the official score; remaining scored weights are renormalized. |
| **Not Rated** | No eligible evidence. Component omitted; remaining scored weights renormalized. **Never treated as full credit.** |

Do not award 100% for zero or insufficient evidence.

## Common gates

- Individual penalties require an **approved** `ResponsibilityDecision` of `Employee Error`. Equipment / supplier / operational / not-employee-related never reduce an individual component.
- Measurement uses pinned `FormTemplateVersion` / inspection answers, not the live template.
- Assistant Manager attribution is provisional whole-branch until duty rosters exist.

---

## A. Timeliness (Staff 15%)

**Incorrect (withdrawn):** on-time completed submissions ÷ completed submissions.

**Correct:** on-time **completed** tasks ÷ **eligible tasks due**.

- Numerator: tasks whose `submittedAt <= dueAt` (Amman), status completed/approved.
- Denominator: tasks **due** in the period that remain eligible (not excused, not cancelled, not blocked by an approved non-employee issue).
- Missed (never submitted) tasks stay in the denominator and do **not** count as on-time.
- Status: Scored if denominator ≥ 10; Provisional if 1–9; Not Rated if 0.

## B. Checklist Quality (Staff 20%)

**Incorrect (withdrawn):** simple mean of inspection-run scores.

**Correct:** **answer-weighted** quality:

`sum(answer.score) ÷ sum(answer.weight)` over reviewed, non-voided answers in the employee’s runs in the period.

- Uses per-field scoring metadata (weight, pass values), not one score per run.
- Zero-weight answers excluded from both sides.
- Status: Scored if ≥ 20 weighted answers; Provisional if 1–19; Not Rated if 0.

## C. Recurring Issues (Staff 5%; similar exposure idea for AM/BM repeat components)

**Incorrect (withdrawn):** `1 − (repeat issues ÷ total issues)` without exposure, and “0 issues → full score”.

**Correct:** **exposure-adjusted recurrence** with a minimum-evidence floor.

`repeatCount ÷ exposureCount`

- `repeatCount`: approved Employee Error issues whose same template-question key failed again within the configured window (default 14 days).
- `exposureCount`: eligible completed inspections (or eligible answers) in the period that could have produced that failure — the opportunities to fail.
- Component score = `max(0, 1 − rate)` scaled to 0–100, only when `exposureCount ≥ minimum` (proposed 10 inspections / 3 attributed issues — business-confirmable).
- Below minimum: **Provisional** or **Not Rated**, never automatic 100%.

## D. Critical Issues (Branch Manager 15%; also SLA speed metrics)

**Incorrect (withdrawn):** only resolved-within-SLA ÷ resolved (open overdue criticals ignored).

**Correct:** overdue **unresolved** critical issues count against SLA performance.

Denominator includes:

1. Critical issues **resolved** in the period, and
2. Critical issues **still open** whose SLA deadline has passed (overdue unresolved).

Numerator: those in the denominator that were resolved **within** the critical SLA.

An overdue open critical issue is a miss, not an exclusion.

SLA hours remain a business decision and stay configurable.

## E. Missing data

Use **Scored / Provisional / Not Rated** as above. Insufficient evidence never becomes a perfect score.

---

## Role weights (proposal; versioned, not hardcoded)

**Staff:** QC Task Execution 25 · Checklist Quality 20 · Timeliness 15 · Product Quality 15 · Cleaning & SOP 10 · Corrective Actions 10 · Recurring Issues 5

**Assistant Manager:** Branch Completion 20 · Issue Resolution Speed 20 · Staff Follow-up 15 · Opening/Closing 15 · Repeat Issues 10 · Product & Cleaning 10 · Corrective Actions 10

**Branch Manager:** Overall Branch QC 25 · Critical Issues 15 · Corrective Action Speed 15 · Checklist Completion 10 · Repeat Issue Reduction 10 · Product Quality 10 · Food Safety 10 · Team Improvement 5

Visibility (provisional): staff → own KPI only; branch managers → authorized branch staff; QC + Owner → organization-wide. Weight editing: Owner only.
