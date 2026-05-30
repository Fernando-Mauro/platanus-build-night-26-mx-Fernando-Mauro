// Adaptive gating with hysteresis (T027) — PURE.
// A competency is gated by its prerequisite's mastery. To avoid flicker around
// the threshold we use a ±band (FR-009/011/012):
//   lock   when prereq mastery <  gateLockBelow   (e.g. 40)
//   unlock when prereq mastery >  gateUnlockAbove  (e.g. 45)
//   in the dead-band [40,45] → keep the previous status (sticky).
import type { Tuning } from "./tuning";

export type Status = "LOCKED" | "AVAILABLE" | "RECOMMENDED" | "MASTERED";

/**
 * Derive a competency's status from its own mastery + its prerequisite's mastery.
 * `RECOMMENDED` is layered on top later by the recommendation pass; this returns
 * the structural status (LOCKED / MASTERED / AVAILABLE).
 */
export function deriveStatus(opts: {
  ownMastery: number;
  prereqMastery: number | null; // null = no prerequisite (chain root)
  prevStatus: Status | null;
  tuning: Tuning;
}): Status {
  const { ownMastery, prereqMastery, prevStatus, tuning } = opts;

  let locked = false;
  if (prereqMastery !== null) {
    if (prereqMastery < tuning.gateLockBelow) locked = true;
    else if (prereqMastery > tuning.gateUnlockAbove) locked = false;
    else locked = prevStatus === "LOCKED"; // dead-band: sticky
  }

  if (locked) return "LOCKED";
  if (ownMastery >= tuning.masteryThreshold) return "MASTERED";
  return "AVAILABLE";
}
