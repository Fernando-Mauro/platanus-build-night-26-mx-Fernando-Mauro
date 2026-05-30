// Engine unit tests (T023). Run with `pnpm test` (node:test via tsx).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMasteryUpdate, isRealVerdict } from "../../features/knowledge/update";
import { DEFAULT_TUNING } from "../../features/knowledge/tuning";

const T = DEFAULT_TUNING; // ±15, clamp 0–100

test("pass adds +15 to a single competency", () => {
  const [d] = computeMasteryUpdate({
    verdict: "PASSED",
    competencies: [{ id: 1, pMastery: 50 }],
    tuning: T,
  });
  assert.equal(d.before, 50);
  assert.equal(d.after, 65);
  assert.equal(d.delta, 15);
});

test("fail subtracts -15 from a single competency", () => {
  const [d] = computeMasteryUpdate({
    verdict: "FAILED",
    competencies: [{ id: 1, pMastery: 50 }],
    tuning: T,
  });
  assert.equal(d.after, 35);
  assert.equal(d.delta, -15);
});

test("multi-competency fail splits the delta equally (−15 → −7.5 ×2)", () => {
  const ds = computeMasteryUpdate({
    verdict: "FAILED",
    competencies: [
      { id: 1, pMastery: 50 },
      { id: 2, pMastery: 50 },
    ],
    tuning: T,
  });
  assert.equal(ds.length, 2);
  assert.equal(ds[0].after, 42.5);
  assert.equal(ds[1].after, 42.5);
});

test("clamps at 100 and 0", () => {
  const [hi] = computeMasteryUpdate({
    verdict: "PASSED",
    competencies: [{ id: 1, pMastery: 95 }],
    tuning: T,
  });
  assert.equal(hi.after, 100);
  const [lo] = computeMasteryUpdate({
    verdict: "FAILED",
    competencies: [{ id: 1, pMastery: 10 }],
    tuning: T,
  });
  assert.equal(lo.after, 0);
});

test("non-real verdicts (ERROR/PENDING) produce no update", () => {
  assert.equal(isRealVerdict("ERROR"), false);
  assert.equal(isRealVerdict("PENDING"), false);
  assert.deepEqual(
    computeMasteryUpdate({ verdict: "ERROR", competencies: [{ id: 1, pMastery: 50 }], tuning: T }),
    []
  );
});

test("LIMIT_EXCEEDED counts as a real (failing) verdict", () => {
  assert.equal(isRealVerdict("LIMIT_EXCEEDED"), true);
  const [d] = computeMasteryUpdate({
    verdict: "LIMIT_EXCEEDED",
    competencies: [{ id: 1, pMastery: 50 }],
    tuning: T,
  });
  assert.equal(d.after, 35);
});

test("SC-002: two fails drop 50 → 35 → 20", () => {
  const step1 = computeMasteryUpdate({
    verdict: "FAILED",
    competencies: [{ id: 1, pMastery: 50 }],
    tuning: T,
  })[0];
  assert.equal(step1.after, 35);
  const step2 = computeMasteryUpdate({
    verdict: "FAILED",
    competencies: [{ id: 1, pMastery: step1.after }],
    tuning: T,
  })[0];
  assert.equal(step2.after, 20);
});
