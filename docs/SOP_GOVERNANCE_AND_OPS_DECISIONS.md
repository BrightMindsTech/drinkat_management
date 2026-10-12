# Owner decisions — SOP governance and operational rules

**Status:** recommendations for owner approval. Nothing in this file is live DRINKAT policy.  
**Do not** treat staging escalation hours, FDA citations, or these options as food-safety law.

## A. Escalation SLAs (unapproved examples)

Current staging `QcAppConfig` defaults:

| Severity | Hours | Meaning |
| --- | --- | --- |
| Critical | 4 | Example only |
| High | 24 | Example only |
| Medium | 72 | Example only |
| Low | 168 | Example only |

**Recommendation:** keep these as shadow KPI inputs until the owner signs `escalation_defaults_approved=1` with a written basis (brand ops, not “FDA requires 4 hours” — the Food Code does not set these SLAs).  
**Until approved:** code continues to use the numbers for shadow corrective scoring and reminder cadence only.

## B. Assistant Manager accountability

**Recommendation:** duty-roster attribution — AM is scored only for issues on shifts where they were the named Person in Charge / rostered AM.

**Until approved and implemented:** keep `provisional_whole_branch` attribution. Do not silently change KPI math.

## C. Opening / closing assignments

Seed today assigns opening/closing schedules to `role=staff`. Options for owner:

1. Staff only (current).
2. Staff + Assistant Manager.
3. Staff + AM + Branch Manager (manager reviews, does not replace staff open).

**Recommendation:** option 2 after a written roster exists.  
**Until approved:** do not change `InspectionSchedule` assignee roles.

## D. SOP governance (required before any `approved=1` document)

| Role | Proposed duty |
| --- | --- |
| Document owner | Owner names one person per SOP (usually QC lead). |
| QC reviewer | Reviews FDA citations vs house facts; sets `reviewStatus`. Cannot approve FDA/DRAFT/SYNTHETIC rows. |
| Approval authority | Owner + QC two-person sign-off on a **new** `sourceRef` that does not start with `SYNTHETIC:`, `DRAFT:`, or `FDA:`. |
| Version control | New signed SOP = new `SopDocument` row. Do not flip `approved` on a draft row. |
| Effective date | Printed on the signed document; unset on drafts. |
| Review date | Recommend 12 months or after a local-law change. Unset until signed. |
| Withdrawal | Owner marks the signed row unapproved or replaces it; assistant then stops retrieving it. |
| Audit history | `reviewedById`, `reviewedAt`, `reviewNote` on drafts; signed documents need a written change log outside FDA drafts. |

FDA Food Code 2026 remains a U.S. model code. Local applicability is an owner/legal decision.

Live SOP assistant stays blocked until at least one genuine approved DRINKAT document exists.
