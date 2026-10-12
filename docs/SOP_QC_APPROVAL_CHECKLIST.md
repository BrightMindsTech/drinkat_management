# QC-manager SOP approval checklist

Generated FDA drafts **cannot** be approved in this workflow. `PATCH /api/sop/documents/[id]` with `action=approve` always returns **400**. Ingest never writes `approved=1`.

## What “review” means

Owner or QC may set `reviewStatus` to:

| Status | Meaning |
| --- | --- |
| `draft` | Ingested, not reviewed |
| `qc_reviewed` | Citations and proposed text were read. Still **not** policy |
| `needs_info` | Missing DRINKAT operating facts block a real SOP |
| `rejected` | Draft is not useful; still unapproved |

`approved` remains `false` after every review action.

## Checklist before a real DRINKAT SOP may be written (new document)

Use a **new** `sourceRef` that does **not** start with `SYNTHETIC:`, `DRAFT:`, or `FDA:`.

1. Confirm the local authority rule that actually applies (do not assume FDA Food Code 2026 is local law).
2. Fill every “Missing DRINKAT-specific operating information” item for that domain.
3. Quote FDA sections only as reference, labeled separately from house procedure.
4. Do not copy FDA temperatures, ppm charts, or cook times as house recipes unless QC explicitly adopts them and names the local legal basis.
5. Do not invent equipment set-points, sanitizer ppm, espresso recipes, or stop-sale rules.
6. Provide EN and AR bodies that a floor employee can follow.
7. Two-person sign-off: QC reviewer + owner.
8. Only then ingest a **new** row. Approval of that new row is a later, explicit product decision — this release still refuses FDA/DRAFT/SYNTHETIC approval.

## Assistant rule

The live SOP assistant (`/api/ai/run` kind=`sop`) reads `SopDocument` where `approved=true` only. Zero approved rows → `sop_unavailable` (fail-closed, not mocked). Draft search is QC review only.
