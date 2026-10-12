# F. SOP ingestion and retrieval test report

**Environment:** staging Worker `drinkat-qc-staging` version `225c2c2d-d620-4cdf-9937-56f967246355` / D1 `9d1e8590-38c8-4cf8-afe0-ca21a7bcc91c` only.  
**Production:** Worker `drinkat-management` / D1 `d890068e-dccb-422d-b19d-2e40928b30df` / R2 `drinkat-management-uploads` **not modified**.  
**iOS:** bundle `com.bmtechs.drinkat` and UA `DrinkatHR-Native` **not changed**.

## Live evidence (2026-10-10)

| Check | Result |
| --- | --- |
| `0020_sop_review.sql` on staging D1 | Applied (7 queries; staging id only) |
| Draft ingest | 18 rows upserted; `approved=0`; unapproved count 19 (18 FDA + prior synthetic) |
| `npm run verify:fda-sop` | ok |
| `verify:staging-http` | **57/57** including EN/AR 2-301 search, staff search 403, approve hard-400, `sop_unavailable` `mocked=false` |
| Listed SOP rows after HTTP | 20, all `approved=false`, assistant `blocked` |

## Ingest

| Step | Command | Guard |
| --- | --- | --- |
| Schema | `npm run db:d1:migrate:sop-review:staging` | `db:d1:migrate:sop-review:remote` refuses production |
| Drafts | `npm run db:ingest:fda-sop:staging` | Config must contain staging D1 id; refuses production D1 id; upserts `approved:false`; fails if any approved row exists |
| Unit | `npm run verify:fda-sop` | Index coverage, unapprovable sources, EN/AR retrieval, assistant still `approved:true` only, 0020 additive |

## Retrieval questions

| Q | Locale | Expected |
| --- | --- | --- |
| When should food employees wash their hands? | en | FDA 2-301.12 / 2-301.14; draft `handwashing-health`; `approvedAnswersEnabled=false` |
| متى يجب غسل اليدين | ar | Same sections; Arabic draft |
| What is the cold holding temperature for TCS food? | en | 3-501.16 cited as **FDA**, not a DRINKAT house set-point |
| How must customers be notified of major food allergens? | en | 3-602.12(C) |
| How often must TCS food-contact surfaces be cleaned? | en | 4-602.11 |

## HTTP gates (`verify:staging-http`)

- Staff `GET /api/sop/search` → 403
- Owner EN/AR search → 200, `approvedAnswersEnabled=false`, 2-301 hit
- Listed SOP rows all `approved=false`; assistant status `blocked`
- `PATCH` `action=approve` on a `DRAFT:` row → 400
- `POST /api/ai/run` kind=`sop` → 503/422, `mocked=false`, `sop_unavailable`

## Non-goals

- No `SopDocument.approved=1`
- No production migrate/ingest/deploy
- Drafts are not presented as approved DRINKAT policy
