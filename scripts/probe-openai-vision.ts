/**
 * Direct GPT-4o vision probe using the staging OpenAI key.
 * Does not write operational records. Does not print secrets.
 */
import { readFileSync } from 'node:fs';

function loadStagingVars() {
  const raw = readFileSync(new URL('../.dev.vars.staging', import.meta.url), 'utf8');
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map.set(t.slice(0, i), t.slice(i + 1).replace(/^"|"$/g, ''));
  }
  return map;
}

const vars = loadStagingVars();
for (const key of ['OPENAI_API_KEY', 'AI_PROVIDER', 'AI_PAID_USAGE_APPROVED', 'AI_VISION_MODEL']) {
  const v = vars.get(key);
  if (v) process.env[key] = v;
}
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
process.env.AI_PAID_USAGE_APPROVED = process.env.AI_PAID_USAGE_APPROVED || '1';

async function main() {
  const { runAi } = await import('../src/lib/ai-provider');
  const photo = readFileSync(new URL('../docs/source/drinkat-manual-pages/page-06.png', import.meta.url));
  const result = await runAi(
    'photo_qc',
    {
      title: 'Photographed DRINKAT operations-manual page (vision pipeline probe)',
      slotLabel: 'n/a',
      measuredValue: '',
      handwrittenNote: 'Not an approved specification.',
      criteria: [{ key: 'printed_text_visible', labelEn: 'Printed text is visible on the page', weight: 1 }],
      referenceCount: 0,
      fdaHints: [],
      sopExcerpts: [],
    },
    [{ mime: 'image/png', base64: photo.toString('base64') }]
  );

  console.log(
    JSON.stringify(
      {
        mocked: result.mocked,
        provider: result.provider,
        model: result.model,
        summary: result.summary,
        suggestion: result.suggestion,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedUsd: result.estimatedUsd,
        latencyMs: result.latencyMs,
        imageBytes: photo.length,
        imagePx: '1190x1683',
        note: 'Photographed document page, not a branch 360 inspection photograph.',
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
