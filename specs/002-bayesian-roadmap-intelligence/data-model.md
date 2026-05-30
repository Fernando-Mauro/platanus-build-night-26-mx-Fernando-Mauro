# Phase 1 Data Model: Bayesian Roadmap Intelligence + Cognito Auth

Delta over the feature-001 schema (`schema.dbml` / `prisma/schema.prisma`). PostgreSQL via Prisma,
accessed only through `lib/db`.

## Auth delta

### users (modified)
- **+ `cognito_id` (string, UNIQUE, not null)** — the Cognito `sub`; stable identity for referential
  integrity of all mastery/submission rows (the user's explicit requirement).
- `email` (unique), `display_name`, `created_at`, `updated_at` (existing).
- Rules: a `users` row is **upserted by `cognito_id`** on first successful Cognito auth (JIT sync).
  `email`/`password` columns from 001 become optional (auth now lives in Cognito, not local creds).
- All learner-scoped tables (`concept_mastery`/`topic_mastery`/`submissions`/`recommendations`)
  continue to FK to `users.id`; `cognito_id` is the external key the session maps in.

## Bayesian engine (realizing the spec on the 001 two-layer schema)

### Competency ("Competencia")
First-class knowledge unit (the 001 "concept" layer, surfaced as the user-facing "Competencia").
- `id`, `slug`, `name`, `topic_id` (the topic it rolls up to), prerequisite edges via
  `concept_prerequisites`.
- **Seed (5, linear chain)**: Arreglos → Loops/Hashing → Recursión → Árboles → Grafos.

### Problem ↔ Competency link (`problem_concepts`)
- `problem_id`, `concept_id`. For the equal-split rule, the effective weight per link is
  `1 / (count of competencies on that problem)` computed at update time (no stored weight needed for
  the demo; the column from 001 may stay = 1).

### ConceptMastery (per learner, per competency) — the live state
- `user_id`, `concept_id`, `p_mastery` (0–100), `status` (LOCKED|AVAILABLE|RECOMMENDED|MASTERED),
  `last_submission_id` (traceability), `updated_at`, `model_version_id`.
- **Cold start**: created at **50** for every competency when the learner is first seen.

### TopicMastery (derived)
- `user_id`, `topic_id`, `p_mastery` = mean of the topic's ConceptMastery; `status` with hysteresis.

### TuningParams (`model_versions.params`, jsonb) — configurable, no code change
```json
{ "learningRateUp": 15, "learningRateDown": 15,
  "gateLockBelow": 40, "gateUnlockAbove": 45,
  "coldStart": 50, "masteryThreshold": 80 }
```

### Submission (existing) — drives updates
- Already records verdict + `evidence_applied_at` (idempotency guard from 001). The engine reads the
  terminal verdict and applies the update exactly once.

## Update algorithm (engine contract)
1. Submission reaches a real terminal verdict (else **no update**, FR-014).
2. `base = pass ? +learningRateUp : −learningRateDown`.
3. For each linked competency: `delta = base / nLinkedCompetencies`; `p = clamp(p + delta, 0, 100)`;
   set `last_submission_id`.
4. Recompute affected `TopicMastery` (mean).
5. **Gating (hysteresis)**: if topic `p < 40` → lock dependent advanced topic(s) + recommend a
   prerequisite reinforcement problem (or easier same-topic if no prereq). Re-unlock only when `p > 45`.
6. Mark `evidence_applied_at` (idempotent); refresh `recommendations`.

## Seed (`prisma/seed.ts`) — 10 problems, deterministic
~2 problems per competency across the 5-chain, each linked to its competency(ies), with visible +
hidden test cases, plus one active `model_versions` row holding the tuning params above. A new learner
gets 50% ConceptMastery for all 5 competencies on first sync.
