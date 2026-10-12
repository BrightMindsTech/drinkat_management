export type PhotoCriterionDef = {
  key: string;
  labelEn: string;
  labelAr?: string;
  weight: number;
};

export type PhotoCriterionAssessment = {
  key: string;
  met: boolean | null;
  note?: string;
};

export type PhotoScoreResult = {
  outcome: 'pass' | 'fail' | 'unassessable';
  score: number | null;
  assessments: PhotoCriterionAssessment[];
};

export function parseCriteriaJson(raw: string | null | undefined): PhotoCriterionDef[] {
  try {
    const v = JSON.parse(raw || '[]') as unknown;
    if (!Array.isArray(v)) return [];
    const out: PhotoCriterionDef[] = [];
    for (const row of v) {
      const r = row as Record<string, unknown>;
      const key = String(r.key ?? '').trim();
      const weight = Number(r.weight);
      if (!key || !Number.isFinite(weight) || weight <= 0) continue;
      out.push({
        key,
        labelEn: String(r.labelEn ?? key),
        labelAr: r.labelAr ? String(r.labelAr) : undefined,
        weight,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Deterministic quality score from criterion assessments.
 * GPT-4o must not invent a 0–100 total.
 * PASS = every assessable criterion met.
 * FAIL = any assessable criterion not met.
 * UNASSESSABLE = no criterion could be assessed, or the model marked unassessable.
 */
export function scorePhotoCriteria(
  criteria: PhotoCriterionDef[],
  assessments: PhotoCriterionAssessment[],
  unassessable = false
): PhotoScoreResult {
  if (unassessable || criteria.length === 0) {
    return { outcome: 'unassessable', score: null, assessments };
  }
  const byKey = new Map(assessments.map((a) => [a.key, a]));
  let weightSum = 0;
  let metWeight = 0;
  let assessed = 0;
  let failed = 0;
  const merged: PhotoCriterionAssessment[] = [];
  for (const c of criteria) {
    const hit = byKey.get(c.key);
    const met = hit?.met ?? null;
    merged.push({ key: c.key, met, note: hit?.note });
    if (met == null) continue;
    assessed += 1;
    weightSum += c.weight;
    if (met) metWeight += c.weight;
    else failed += 1;
  }
  if (assessed === 0 || weightSum <= 0) {
    return { outcome: 'unassessable', score: null, assessments: merged };
  }
  const score = Math.max(0, Math.min(100, (metWeight / weightSum) * 100));
  return {
    outcome: failed > 0 ? 'fail' : 'pass',
    score,
    assessments: merged,
  };
}
