// Engine tuning (T020). Normalizes the active `model_versions.params` jsonb into
// a typed shape with safe defaults, so changing the row changes behavior with no
// code change (SC-008). Pure — no Prisma, no env; safe to unit-test.

export type Tuning = {
  learningRateUp: number;
  learningRateDown: number;
  gateLockBelow: number;
  gateUnlockAbove: number;
  coldStart: number;
  masteryThreshold: number;
};

export const DEFAULT_TUNING: Tuning = {
  learningRateUp: 15,
  learningRateDown: 15,
  gateLockBelow: 40,
  gateUnlockAbove: 45,
  coldStart: 50,
  masteryThreshold: 80,
};

/** Coerce an arbitrary jsonb `params` blob into a valid Tuning, filling gaps. */
export function normalizeTuning(params: unknown): Tuning {
  const p = (params ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  // `learningRate` is the single-knob demo form; up/down can override per-direction.
  const lr = num(p.learningRate, DEFAULT_TUNING.learningRateUp);
  return {
    learningRateUp: num(p.learningRateUp, lr),
    learningRateDown: num(p.learningRateDown, lr),
    gateLockBelow: num(p.gateLockBelow, DEFAULT_TUNING.gateLockBelow),
    gateUnlockAbove: num(p.gateUnlockAbove, DEFAULT_TUNING.gateUnlockAbove),
    coldStart: num(p.coldStart, DEFAULT_TUNING.coldStart),
    masteryThreshold: num(p.masteryThreshold, DEFAULT_TUNING.masteryThreshold),
  };
}
