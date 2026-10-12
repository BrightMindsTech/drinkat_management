import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { QC_INSPECTION_DOMAINS } from '../src/lib/qc-domains';
import {
  citationsForDomain,
  FDA_FOOD_CODE_2026,
  FDA_FOOD_CODE_2026_INDEX,
  searchFdaIndex,
} from '../src/lib/fda-food-code-2026';
import {
  canAdoptSopSource,
  canApproveSopSource,
  DRINKAT_SOP_DRAFTS,
  isUnapprovableSopSource,
  searchDraftLibrary,
  SOP_DRAFT_PREFIX,
} from '../src/lib/drinkat-sop-drafts';
import { isSyntheticSopSource } from '../src/lib/ai-sop';

assert.equal(FDA_FOOD_CODE_2026.url, 'https://www.fda.gov/media/194741/download?attachment');
assert.match(FDA_FOOD_CODE_2026.legalNote, /not automatically applicable/i);
assert.ok(FDA_FOOD_CODE_2026_INDEX.length >= 20);

for (const domain of QC_INSPECTION_DOMAINS) {
  assert.ok(citationsForDomain(domain).length > 0, `FDA index missing ${domain}`);
}

const wash = searchFdaIndex('When should food employees wash their hands?');
assert.ok(wash.some((c) => c.section === '2-301.14' || c.section === '2-301.12'));

const arWash = searchFdaIndex('متى يجب غسل اليدين؟');
assert.ok(arWash.some((c) => c.section.startsWith('2-301')), 'Arabic handwash must hit 2-301');

const cold = searchFdaIndex('What is the cold holding temperature for TCS food?');
assert.ok(cold.some((c) => c.section === '3-501.16'));

const allergen = searchFdaIndex('How must customers be notified of major food allergens?');
assert.ok(allergen.some((c) => c.section === '3-602.12(C)'));

const arAllergen = searchFdaIndex('كيف نبلغ عن مسببات الحساسية؟');
assert.ok(arAllergen.some((c) => c.section.startsWith('3-602')));

assert.equal(DRINKAT_SOP_DRAFTS.length, 18);
assert.equal(DRINKAT_SOP_DRAFTS.filter((d) => d.locale === 'en').length, 9);
assert.equal(DRINKAT_SOP_DRAFTS.filter((d) => d.locale === 'ar').length, 9);

for (const draft of DRINKAT_SOP_DRAFTS) {
  assert.ok(draft.sourceRef.startsWith(SOP_DRAFT_PREFIX));
  assert.equal(isUnapprovableSopSource(draft.sourceRef), true);
  assert.match(draft.body, /DRAFT|مسودة/);
  assert.match(draft.body, /NOT APPROVED|غير معتمد/);
  assert.match(draft.body, /QC review checklist|قائمة مراجعة مدير الجودة/);
  assert.match(draft.body, /Required operational evidence|أدلة تشغيل مطلوبة/);
  assert.match(draft.body, /Corrective-action guidance|توجيه الإجراء التصحيحي/);
  assert.ok(draft.fdaSections.length > 0);
  assert.ok(draft.missingDrinkatInfo.length > 0);
  assert.doesNotMatch(draft.body, /approved DRINKAT policy|سياسة DRINKAT المعتمدة/);
}

assert.equal(isUnapprovableSopSource('FDA:2-301.12'), true);
assert.equal(isUnapprovableSopSource('SYNTHETIC:x'), true);
assert.equal(isUnapprovableSopSource('DRAFT:FDA-FC-2026:food_safety:x'), true);
assert.equal(isUnapprovableSopSource('DRINKAT-QC-SIGNED:handwash-v1'), false);
assert.equal(canAdoptSopSource('DRAFT:FDA-FC-2026:food_safety:x'), true);
assert.equal(canAdoptSopSource('SYNTHETIC:x'), false);
assert.equal(canApproveSopSource('DRINKAT-ADOPTED:food_safety:x'), true);
assert.equal(canApproveSopSource('DRINKAT-MANUAL:qc-barista'), true);
assert.equal(isUnapprovableSopSource('DRINKAT-MANUAL:qc-barista'), false);
assert.equal(canApproveSopSource('DRAFT:FDA-FC-2026:food_safety:x'), false);
assert.equal(isSyntheticSopSource('SYNTHETIC:x'), true);

const libEn = searchDraftLibrary('When should food employees wash their hands?', 'en');
assert.ok(libEn.some((d) => d.key === 'handwashing-health' && d.locale === 'en'));
const libAr = searchDraftLibrary('متى يجب غسل اليدين', 'ar');
assert.ok(libAr.some((d) => d.key === 'handwashing-health' && d.locale === 'ar'));

const guided = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/components/qc-ops/GuidedInspection.tsx'),
  'utf8'
);
assert.match(guided, /readOnly/);
assert.match(guided, /submittedAnswers/);
assert.match(guided, /readOnly \? null/);

const retrieveSrc = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/ai-sop.ts'),
  'utf8'
);
assert.match(retrieveSrc, /approved:\s*true/);
assert.doesNotMatch(retrieveSrc, /searchDraftLibrary/);

const patch = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/app/api/sop/documents/[id]/route.ts'),
  'utf8'
);
assert.match(patch, /canApproveSopSource/);
assert.match(patch, /canAdoptSopSource/);
assert.match(patch, /SYNTHETIC/);

const mig = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../prisma/migrations/0020_sop_review.sql'),
  'utf8'
);
const sqlBody = mig
  .split('\n')
  .filter((l) => l.trim() && !l.trim().startsWith('--'))
  .join('\n')
  .toUpperCase();
assert(!sqlBody.includes('DROP TABLE'));
assert(!sqlBody.includes('DROP COLUMN'));
assert(!sqlBody.includes('DELETE FROM'));
assert(!sqlBody.includes('APPROVED = 1'));
assert(!sqlBody.includes('APPROVED=1'));
assert(sqlBody.includes('ADD COLUMN'));

const ingest = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../scripts/ingest-fda-sop-drafts-staging.ts'),
  'utf8'
);
assert.match(ingest, /approved:\s*false/);
assert.match(ingest, /REFUSED/);
assert.match(ingest, /d890068e-dccb-422d-b19d-2e40928b30df/);

const pkg = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8');
const runbook = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../docs/PRODUCTION_MIGRATION_RUNBOOK.md'),
  'utf8'
);
assert.match(runbook, /0020_sop_review/);

assert.match(pkg, /db:d1:migrate:sop-review:remote/);
assert.match(pkg, /0016 must not run against production|0020 must not run against production/);

console.log('fda-sop: ok');
