# DRINKAT QC — Real AI staging setup

Live AI is **fail-closed**. User-facing routes never return mocked answers.

## Current state (2026-10-10, after owner key)

- Staging Worker `drinkat-qc-staging` version `673a65a6-7dd5-41cd-80f9-4a4b6381f58a`
- `OPENAI_API_KEY` stored as a **staging Worker secret** (not in git, not in production)
- `AI_PROVIDER=openai`, `AI_PAID_USAGE_APPROVED=1` on staging vars only
- Live staging test `npm run verify:staging-ai`: **8/8 PASS**
- Approved `SopDocument` count is still **0** → SOP assistant remains **BLOCKED** (correct; no invented SOPs)
- Production Worker has no OpenAI secret and no paid-usage flag

## Required configuration (staging Worker secrets)

Set on `drinkat-qc-staging` only. Do **not** put these in client code or production.

```
OPENAI_API_KEY=<owner-provided secret>
AI_PROVIDER=openai
AI_PAID_USAGE_APPROVED=1
```

Optional:

```
AI_VISION_MODEL=gpt-4o
AI_TEXT_MODEL=gpt-4o-mini
AI_TRANSCRIBE_MODEL=whisper-1
```

Commands (owner/operator, after budget approval):

```
npx wrangler secret put OPENAI_API_KEY --config wrangler.staging.jsonc
npx wrangler secret put AI_PROVIDER --config wrangler.staging.jsonc
npx wrangler secret put AI_PAID_USAGE_APPROVED --config wrangler.staging.jsonc
```

`AI_PAID_USAGE_APPROVED` must be the string `1`. A key without this flag still does **not** call OpenAI.

## SOP assistant

Blocked until approved DRINKAT SOP rows exist in `SopDocument` with `approved=1`.
Do not load generic internet text. Do not invent procedures.

## Estimated OpenAI list prices (public, subject to change)

| Feature | Model | Estimated cost |
| --- | --- | --- |
| Photo QC | gpt-4o vision | **$0.02–$0.06** per image |
| Product comparison | gpt-4o, 2 images | **$0.04–$0.10** |
| Daily brief | gpt-4o-mini | **$0.001–$0.005** |
| Coaching | gpt-4o-mini | **$0.001–$0.005** |
| SOP (once docs exist) | gpt-4o-mini | **$0.001–$0.005** |
| Voice | whisper-1 | **$0.006 / minute** |

Suggested staging validation budget: **USD 20–50** for a week of QC examples (hundreds of photo reviews, not thousands).

## Live staging results (real OpenAI)

| Feature | Result | Latency | Est. cost |
| --- | --- | --- | --- |
| Photo QC | gpt-4o, verdict=manual_review | ~2.1s | ~$0.002 |
| Product comparison | gpt-4o, compliance=uncertain | ~2.3s | ~$0.002 |
| Daily brief | gpt-4o-mini | ~3.3s | ~$0.00008 |
| Coaching | gpt-4o-mini | ~1.8s | ~$0.001 |
| Voice EN | whisper-1 exact phrase | ~1.8s | ~$0.006/min |
| SOP | 503 sop_unavailable | — | $0 |

## What was not done

- No production secret
- No production deploy
- No official KPI publication
- No approved SOP corpus loaded
- Arabic spoken-audio clip was not separately recorded (English `say` transcription TESTED)
