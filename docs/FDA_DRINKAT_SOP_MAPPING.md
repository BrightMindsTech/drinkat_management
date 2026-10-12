# FDA Food Code 2026 → DRINKAT QC mapping

**Source:** [FDA Food Code 2026](https://www.fda.gov/media/194741/download?attachment)  
**Legal:** The Food Code is a U.S. model for adoption by jurisdictions. It is **not** automatically DRINKAT or host-country law.  
**Status of every generated SOP:** `DRAFT — NOT APPROVED`. `SopDocument.approved` stays `0`.

## A. Mapping matrix

| QC domain | Draft SOP keys (EN + AR) | FDA sections used | FDA vs proposed DRINKAT |
| --- | --- | --- | --- |
| `food_safety` | `handwashing-health`, `cold-hold-date-mark` | 2-201.11, 2-301.12, 2-301.14, 2-301.15, 5-202.12, 6-301.11, 6-301.12, 6-301.14, 3-501.16, 3-501.17, 3-501.18 | FDA values (20-second wash, 5°C/41°F hold, 7-day date mark) are quoted as **FDA**. Branch sink maps, illness forms, TCS menu list are **proposed / missing**. |
| `barista_qc` | `barista-rte-contact` | 3-301.11, 3-301.12, 3-302.12, 3-501.16 | RTE contact and tasting are FDA. Espresso recipes, steam-wand settings, milk discard after steaming are **not** invented. |
| `kitchen_qc` | `kitchen-separation-cook` | 3-302.11, 3-401.11, 3-301.12 | Raw/RTE separation and Code cook temperatures are FDA. DRINKAT cook-log form and which SKUs are raw animal foods are missing. |
| `product_quality` | `product-allergens-advisory` | 3-602.12(C), 3-603.11, 3-302.12 | Written allergen notice and raw/undercooked advisory are FDA. Latte art, fill line, garnish photos are brand, not Code. |
| `equipment` | `equipment-clean-sanitize` | 4-204.112, 4-302.14, 4-501.114, 4-602.11, 4-703.11, 3-501.16 | Four-hour TCS food-contact clean + labeled sanitizer are FDA. House ppm, group-head °C, fridge set-points are not invented. |
| `cleaning` | `cleaning-facilities` | 6-501.12, 6-301.11–14, 4-703.11, 5-501 / 6-501 | Facility cleaning frequency is FDA. “Back area sanitized” on the DRINKAT form is broader than food-contact sanitizing and is flagged as unresolved. |
| `brand_standards` | `brand-hygiene-presentation` | 2-304.11, 2-401.11, 2-402.11, 3-602.12(C) | Clean outer clothing, hair restraints, designated eating/drinking are FDA. Music, menu-board “feel,” dress-code photos are brand. |
| Opening (support) | `opening-handwash-station` | 6-301.11, 6-301.12, 6-301.14, 5-202.12 | Handwash station readiness is FDA. Cash / doors / lights have **no** Food Code citation. |

## B. Draft SOP library

Eighteen `SopDocument` rows (9 keys × EN/AR) live in `src/lib/drinkat-sop-drafts.ts` and are upserted to **staging D1 only** with `approved=false` and `sourceRef` prefix `DRAFT:FDA-FC-2026:`.

Each body has four labeled blocks:

1. **STATUS: DRAFT — NOT APPROVED**
2. **FDA requirements (reference only)** — exact section citations
3. **Proposed DRINKAT operating procedure (DRAFT)** — questions for QC, not policy
4. **Missing DRINKAT-specific operating information**

## C. Citation index

Structured retrieval: `src/lib/fda-food-code-2026.ts` (`FDA_FOOD_CODE_2026_INDEX`).  
QC/owner draft search: `GET /api/sop/search` (`mode=draft_review`, `approvedAnswersEnabled=false`).  
Live assistant: `retrieveApprovedSops` still queries `approved: true` only and stays blocked.

## D. Missing DRINKAT-specific operating information

Do not invent these. QC must supply them before any SOP can be rewritten as a real DRINKAT document:

- Whether any local authority adopted FDA Food Code 2026 or an equivalent
- Written employee health / exclusion form and Person in Charge per shift
- Branch sink map; who restocks soap and towels
- DRINKAT TCS item list (milk, sauces, cut fruit, prepared foods)
- Approved thermometer type and calibration schedule
- House date-mark method
- Whether any bare-hand RTE alternative under 3-301.11(E) is authorized
- Milk holding vessels and post-steam discard rule (brand, not FDA recipe)
- Which kitchen items are raw animal foods vs supplier-cooked
- Approved cook-log form
- Major-allergen matrix per SKU / menu item
- Whether any raw or undercooked animal food is sold, plus advisory text
- Sanitizer product, EPA-label use, who tests concentration
- Which machines are TCS food-contact surfaces
- Facility cleaner vs food-contact sanitizer SKUs
- Closing clean sequence and restroom owner
- Written dress / hair-restraint standard
- Opening owner per branch and stop-sale rule if hot water fails

## Retrieval

| Question | Expected FDA hit | Expected draft key |
| --- | --- | --- |
| When should food employees wash their hands? | 2-301.14 / 2-301.12 | `handwashing-health` |
| متى يجب غسل اليدين؟ | 2-301.x | `handwashing-health` (ar) |
| What is the cold holding temperature for TCS food? | 3-501.16 | `cold-hold-date-mark` |
| How must customers be notified of major food allergens? | 3-602.12(C) | `product-allergens-advisory` |
| How often must TCS food-contact surfaces be cleaned? | 4-602.11 | `equipment-clean-sanitize` |
