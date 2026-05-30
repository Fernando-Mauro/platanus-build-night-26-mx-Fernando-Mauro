// Recommendation selection (T028) — PURE.
// Decides what the learner should do next from the roadmap state:
//   1. PREREQUISITE_GAP — a competency dropped below the lock threshold; reinforce
//      it (it's the prereq blocking advanced topics). Pick the weakest such one.
//   2. ADVANCE — nothing weak; point at the first available, not-yet-mastered
//      competency in chain order.
//   3. null — everything mastered.
import type { Status } from "./gating";
import type { Tuning } from "./tuning";

export type Reason = "PREREQUISITE_GAP" | "ADVANCE";

export type RecoCompetency = {
  id: number;
  order: number;
  pMastery: number;
  status: Status;
};

export type Recommendation = { competencyId: number; reason: Reason } | null;

export function selectRecommendation(comps: RecoCompetency[], tuning: Tuning): Recommendation {
  if (comps.length === 0) return null;
  const byOrder = [...comps].sort((a, b) => a.order - b.order);

  // 1. Weakest competency below the lock threshold → reinforce the prerequisite gap.
  const weak = byOrder
    .filter((c) => c.pMastery < tuning.gateLockBelow)
    .sort((a, b) => a.pMastery - b.pMastery);
  if (weak.length > 0) {
    return { competencyId: weak[0].id, reason: "PREREQUISITE_GAP" };
  }

  // 2. First unlocked, not-yet-mastered competency in chain order → advance.
  const next = byOrder.find(
    (c) => c.status !== "LOCKED" && c.pMastery < tuning.masteryThreshold
  );
  if (next) return { competencyId: next.id, reason: "ADVANCE" };

  // 3. All mastered.
  return null;
}
