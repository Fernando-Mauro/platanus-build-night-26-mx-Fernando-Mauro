// Gating + recommendation unit tests (T030).
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStatus } from "../../features/knowledge/gating";
import { selectRecommendation } from "../../features/knowledge/recommend";
import { DEFAULT_TUNING } from "../../features/knowledge/tuning";

const T = DEFAULT_TUNING; // lock<40, unlock>45, mastery>=80

test("locks when prerequisite mastery < 40", () => {
  const s = deriveStatus({ ownMastery: 50, prereqMastery: 30, prevStatus: "AVAILABLE", tuning: T });
  assert.equal(s, "LOCKED");
});

test("does NOT unlock at exactly 40 (hysteresis dead-band is sticky)", () => {
  const s = deriveStatus({ ownMastery: 50, prereqMastery: 40, prevStatus: "LOCKED", tuning: T });
  assert.equal(s, "LOCKED");
});

test("unlocks only when prerequisite mastery > 45", () => {
  const s = deriveStatus({ ownMastery: 50, prereqMastery: 46, prevStatus: "LOCKED", tuning: T });
  assert.equal(s, "AVAILABLE");
});

test("root competency (no prerequisite) is never locked", () => {
  const s = deriveStatus({ ownMastery: 50, prereqMastery: null, prevStatus: null, tuning: T });
  assert.equal(s, "AVAILABLE");
});

test("mastered when own mastery >= threshold and unlocked", () => {
  const s = deriveStatus({ ownMastery: 85, prereqMastery: 90, prevStatus: "AVAILABLE", tuning: T });
  assert.equal(s, "MASTERED");
});

test("recommendation prefers the weakest prerequisite gap", () => {
  const reco = selectRecommendation(
    [
      { id: 1, order: 1, pMastery: 35, status: "AVAILABLE" },
      { id: 2, order: 2, pMastery: 20, status: "AVAILABLE" },
      { id: 3, order: 3, pMastery: 50, status: "LOCKED" },
    ],
    T
  );
  assert.deepEqual(reco, { competencyId: 2, reason: "PREREQUISITE_GAP" });
});

test("recommendation advances to the first unlocked unmastered competency", () => {
  const reco = selectRecommendation(
    [
      { id: 1, order: 1, pMastery: 90, status: "MASTERED" },
      { id: 2, order: 2, pMastery: 60, status: "AVAILABLE" },
    ],
    T
  );
  assert.deepEqual(reco, { competencyId: 2, reason: "ADVANCE" });
});

test("recommendation is null when everything is mastered", () => {
  const reco = selectRecommendation(
    [{ id: 1, order: 1, pMastery: 100, status: "MASTERED" }],
    T
  );
  assert.equal(reco, null);
});
