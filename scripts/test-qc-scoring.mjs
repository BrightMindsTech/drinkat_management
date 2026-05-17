import assert from 'node:assert/strict';
import { buildQcScoreReport, isQcScoreableFormAnswers } from '../src/lib/qc-form-score-report.ts';
import { resolveQcScoringProfile } from '../src/lib/qc-scoring-profile.ts';

const allYes = {
  evaluator_name: 'QC',
  branch_name: 'HU',
  visit_date: '2026-05-01',
  shift_time: '10:00',
  team_uniform_hygiene_ok: 'Yes',
  drains_clean: 'Yes',
  prep_area_safe: 'Yes',
  delivery_area_clean: 'Yes',
  safety_tools_available: 'Yes',
  customer_service_rating: 'Excellent',
};

assert.equal(resolveQcScoringProfile({ title: 'Quality Control Visit Report - HU' }), 'no-kitchen');
assert(isQcScoreableFormAnswers(allYes, 'no-kitchen'));

const huReport = buildQcScoreReport(allYes, { templateTitle: 'Quality Control Visit Report - HU' });
assert.equal(huReport.scoringProfile, 'no-kitchen');
assert.equal(huReport.finalScore, 100);
assert(!huReport.categories.some((c) => c.label.includes('Kitchen')));

const standardAnswers = {
  ...allYes,
  kitchen_clean: 'Yes',
  kitchen_fridge_temp_ok: 'Yes',
  food_storage_ok: 'Yes',
  expiry_labels_ok: 'Yes',
};
const stdReport = buildQcScoreReport(standardAnswers, { templateTitle: 'Quality Control Visit Report - MEU' });
assert.equal(stdReport.scoringProfile, 'standard');
assert(stdReport.categories.some((c) => c.label === 'Product Quality (Kitchen)'));

console.log('qc-scoring: ok');
