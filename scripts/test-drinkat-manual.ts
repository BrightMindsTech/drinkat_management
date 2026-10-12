import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canApproveSopSource, isUnapprovableSopSource } from '../src/lib/drinkat-sop-drafts';
import { DRINKAT_MANUAL_PHOTO_MAP, DRINKAT_OPS_MANUAL_DOCS } from '../src/lib/drinkat-ops-manual';

assert.ok(DRINKAT_OPS_MANUAL_DOCS.length >= 12);
for (const d of DRINKAT_OPS_MANUAL_DOCS) {
  assert.match(d.sourceRef, /^DRINKAT-MANUAL:/);
  assert.equal(isUnapprovableSopSource(d.sourceRef), false);
  assert.equal(canApproveSopSource(d.sourceRef), true);
  assert.match(d.body, /OWNER-APPROVED|معتمد من المالك/);
  assert.doesNotMatch(d.body, /shisha/i);
}

const baristaEn = DRINKAT_OPS_MANUAL_DOCS.find((d) => d.key === 'qc-barista' && d.locale === 'en');
assert.ok(baristaEn);
assert.match(baristaEn.body, /Mango machine cleanliness \(Owner: this is the Slush Machine\)/);
assert.match(baristaEn.body, /Ice maker/);
assert.match(baristaEn.body, /Saturday, Tuesday, and Thursday/);

const openingEn = DRINKAT_OPS_MANUAL_DOCS.find((d) => d.key === 'morning-opening-barista' && d.locale === 'en');
assert.ok(openingEn);
assert.match(openingEn.body, /dose 18 g/);
assert.match(openingEn.body, /yield 36 g/);
assert.match(openingEn.body, /dose 16 g, yield 50 g/);

const kitchenEn = DRINKAT_OPS_MANUAL_DOCS.find((d) => d.key === 'morning-opening-kitchen' && d.locale === 'en');
assert.ok(kitchenEn);
assert.match(kitchenEn.body, /180–200/);
assert.match(kitchenEn.body, /160–180/);

const handoverEn = DRINKAT_OPS_MANUAL_DOCS.find((d) => d.key === 'kitchen-handover' && d.locale === 'en');
assert.ok(handoverEn);
assert.match(handoverEn.body, /0 to 5/);
assert.match(handoverEn.body, /70 grams/);

assert.ok(DRINKAT_MANUAL_PHOTO_MAP.some((m) => m.photoCode === 'slush_machine_cleaning'));
assert.ok(DRINKAT_MANUAL_PHOTO_MAP.every((m) => m.note.length > 10));

const ingest = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'ingest-drinkat-manual-staging.ts'),
  'utf8'
);
assert.match(ingest, /existing\?\.approved \?\? false/);
assert.match(ingest, /ingest never flips approved=1 by itself/);
assert.doesNotMatch(ingest, /drinkat-management --remote/);

const pdf = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../docs/source/DRINKAT-operations-manual.pdf'
);
assert.equal(fs.existsSync(pdf), true);

console.log('drinkat-manual: ok');
