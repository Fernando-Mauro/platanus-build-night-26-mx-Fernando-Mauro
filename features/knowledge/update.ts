// Bayesian mastery update (T020/T021) — bounded linear update.
// PURE: given a verdict + the problem's competencies + tuning, returns the new
// per-competency mastery. No Prisma/IO here so it's trivially unit-testable; the
// persistence + idempotency live in lib/db/submissions.ts (T022).
//
// Algorithm (data-model.md §Update algorithm):
//   base  = pass ? +learningRateUp : −learningRateDown
//   delta = base / nLinkedCompetencies          (equal split, FR-007)
//   p'    = clamp(p + delta, 0, 100)            (FR-006)
import type { Tuning } from "./tuning";

export type Verdict = "PASSED" | "FAILED" | "LIMIT_EXCEEDED" | "ERROR" | "PENDING";

/** A real terminal pass/fail that should move mastery. ERROR/PENDING do not (FR-014). */
export function isRealVerdict(verdict: Verdict): boolean {
  return verdict === "PASSED" || verdict === "FAILED" || verdict === "LIMIT_EXCEEDED";
}

export function isPass(verdict: Verdict): boolean {
  return verdict === "PASSED";
}

export type CompetencyMastery = { id: number; name?: string; pMastery: number };
export type MasteryDelta = {
  competencyId: number;
  name?: string;
  before: number;
  after: number;
  delta: number;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
// Round to 1 decimal to keep the demo numbers clean (50 → 42.5 → 35).
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Compute the new mastery for each competency a problem exercises.
 * Returns [] for non-real verdicts (caller skips the write).
 */
export function computeMasteryUpdate(opts: {
  verdict: Verdict;
  competencies: CompetencyMastery[];
  tuning: Tuning;
}): MasteryDelta[] {
  const { verdict, competencies, tuning } = opts;
  if (!isRealVerdict(verdict) || competencies.length === 0) return [];

  const pass = isPass(verdict);
  const base = pass ? tuning.learningRateUp : -tuning.learningRateDown;
  const perComp = base / competencies.length; // equal split (FR-007)

  return competencies.map((c) => {
    const after = round1(clamp(c.pMastery + perComp));
    return {
      competencyId: c.id,
      name: c.name,
      before: round1(c.pMastery),
      after,
      delta: round1(after - round1(c.pMastery)),
    };
  });
}
