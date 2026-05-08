export type QcCategoryScore = {
  label: string;
  score: number;
  max: number;
};

export type QcScoreReport = {
  branchName: string;
  visitDate: string;
  visitTime: string;
  qcOfficer: string;
  categories: QcCategoryScore[];
  finalScore: number;
  keyWeaknesses: string;
  recommendedActions: string;
  branchManager: string;
};

function isYes(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

function isCriticalIssue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function scoreFromYesNo(answer: string | undefined, weight: number): number {
  return isYes(answer) ? weight : 0;
}

function scoreCustomerService(answer: string | undefined): number {
  const normalized = (answer ?? '').trim().toLowerCase();
  if (normalized === 'excellent') return 20;
  if (normalized === 'good') return 15;
  if (normalized === 'average') return 10;
  if (normalized === 'needs improvement') return 5;
  return 0;
}

export function isQcScoreableFormAnswers(answers: Record<string, string>): boolean {
  return (
    typeof answers === 'object' &&
    answers !== null &&
    'customer_service_rating' in answers &&
    'team_uniform_hygiene_ok' in answers &&
    'kitchen_clean' in answers
  );
}

export function buildQcScoreReport(
  answers: Record<string, string>,
  fallback: { branchName?: string; qcOfficer?: string } = {}
): QcScoreReport {
  const organizationCleanliness =
    scoreFromYesNo(answers.team_uniform_hygiene_ok, 5) +
    scoreFromYesNo(answers.kitchen_clean, 8) +
    scoreFromYesNo(answers.drains_clean, 6) +
    scoreFromYesNo(answers.prep_area_safe, 6) +
    scoreFromYesNo(answers.delivery_area_clean, 5);

  const customerService = scoreCustomerService(answers.customer_service_rating);

  const productQualityBarista =
    scoreFromYesNo(answers.team_uniform_hygiene_ok, 10) +
    scoreFromYesNo(answers.delivery_area_clean, 10);

  const productQualityKitchen =
    scoreFromYesNo(answers.kitchen_fridge_temp_ok, 5) +
    scoreFromYesNo(answers.food_storage_ok, 5) +
    scoreFromYesNo(answers.expiry_labels_ok, 5) +
    scoreFromYesNo(answers.kitchen_clean, 5);

  const managementOrganization =
    scoreFromYesNo(answers.safety_tools_available, 5) +
    (isCriticalIssue(answers.critical_issue) ? 0 : 5);

  const categories: QcCategoryScore[] = [
    { label: 'Organization & Cleanliness', score: organizationCleanliness, max: 30 },
    { label: 'Customer Service', score: customerService, max: 20 },
    { label: 'Product Quality (Barista)', score: productQualityBarista, max: 20 },
    { label: 'Product Quality (Kitchen)', score: productQualityKitchen, max: 20 },
    { label: 'Management & Organization', score: managementOrganization, max: 10 },
  ];

  const totalScore = categories.reduce((sum, row) => sum + row.score, 0);
  const totalMax = categories.reduce((sum, row) => sum + row.max, 0);
  const finalScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return {
    branchName: answers.branch_name?.trim() || fallback.branchName || '—',
    visitDate: answers.visit_date?.trim() || '—',
    visitTime: answers.shift_time?.trim() || '—',
    qcOfficer: answers.evaluator_name?.trim() || fallback.qcOfficer || '—',
    categories,
    finalScore,
    keyWeaknesses: answers.weaknesses?.trim() || '—',
    recommendedActions: answers.recommendations?.trim() || '—',
    branchManager: answers.manager_name?.trim() || '—',
  };
}
