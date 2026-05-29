# Phase 1 Data Model: Adaptive Learning Platform

Authoritative schema: [`schema.dbml`](../../schema.dbml) (PostgreSQL on Amazon RDS), accessed from
Next.js via **Prisma ORM**. This document records (1) the review of the proposed schema, (2) the
Judge0 async refinements, (3) the Bayesian knowledge-graph additions, and (4) how the schema is used
through Prisma inside Next.js. Semantics follow the spec Clarifications (2026-05-29): two-layer model
(Concepts→Topics), directional prerequisite propagation, versioned mastery, idempotent updates.

---

## 1. Review of the proposed schema

The base schema is solid (clean content/contest/course domains, sample-vs-hidden test cases,
`languages.judge0_id`). Gaps found for **optimal, asynchronous** Judge0 operation and for the
adaptive roadmap:

### Judge0 / async — gaps and fixes

| # | Gap in original | Why it matters | Fix applied |
|---|-----------------|----------------|-------------|
| J1 | No Judge0 **token** stored anywhere | Async judging returns tokens; without persisting them you can't correlate an async poll/callback back to the row. | `verdicts.judge0_token` (unique) per test case; optional `submissions.judge0_batch_token`. |
| J2 | Only `submissions.total_score`; no **overall verdict** | UI/recommendation need a single normalized result (AC/WA/TLE…). | Added `submissions.verdict` (+ `passed_count`/`total_count`). |
| J3 | No **idempotency guard** for the mastery update | A re-poll, callback retry, or reconnect could double-count evidence (violates FR-009). | `submissions.evidence_applied_at` (NULL until applied; applied at most once). |
| J4 | No **timing/attempt** evidence fields | The Bayesian engine uses time and attempts, not just correctness (FR-008). | `max_time_ms`, `max_memory_kb`, `attempt_number`, `queued_at`, `judged_at`. |
| J5 | `verdicts.status` mixes per-case and submission-level (`CE`) | Compile error is per submission; status indexing/lookups need shape. | Kept `CE` at submission level (`submissions.verdict`), added `compile_output` on verdicts; unique `(submission_id, test_case_id)`, index `(submission_id)`. |
| J6 | No index to find **unresolved** submissions | An async poller/worker must scan pending work efficiently. | Index `submissions(status)`; `judge0_id` made unique on `languages`. |

**Async model reconciliation (important):** the spec chose a **synchronous** submission API (30 s
wait, FR-005a), while this schema models an **async** state machine (`pending → processing →
completed/error`). These are complementary, not contradictory: the synchronous request simply
*awaits* this state machine for up to 30 s, and the same machine lets a background poller/callback
finish a submission **after the learner disconnects** — which is exactly the abandoned-submission
requirement (FR-007). The status column + token correlation are what make "óptima y asíncrona" work.

### Roadmap / Bayesian — gap

The base schema had **no** knowledge graph or per-user probabilistic state — only content
`categories`/`tags`. Added a dedicated two-layer knowledge graph + Bayesian state tier (section 3).
`topics` (adaptive layer) is kept **distinct** from `categories` (content taxonomy); topics may be
seeded to mirror categories but they drive the adaptive roadmap.

---

## 2. Submission lifecycle & evidence (state machine)

```
            submit (sync request opens, ≤30s budget)
  pending ───────────────► processing ──(all verdicts resolve)──► completed ──► verdict ∈ {AC,WA,TLE,MLE,RE,CE}
     │                          │                                     │
     │                          └──(Judge0 unreachable/5xx)──► error  │  (retryable 502; NO mastery update)
     │                                                                ▼
     └────────── client may disconnect; poller/callback still drives to terminal (FR-007)
                                                                evidence applied ONCE
                                                          (evidence_applied_at guard) → Bayesian update
```

- Terminal transition is the **only** place evidence is built `{correct, max_time_ms,
  attempt_number}` and the Bayesian engine runs — inside one DB transaction, guarded by
  `evidence_applied_at` for idempotency (FR-009).
- `error` (Judge0 down) applies **no** evidence; the API returns a retryable 502.

---

## 3. Knowledge graph & Bayesian state (added tables)

- **`topics`** — upper-layer roadmap nodes (Arrays, Graphs, DP), with ordering.
- **`concepts`** — lower-layer Bayesian skill nodes under a topic; carry BKT params
  (`p_init`, `p_learn`, `p_slip`, `p_guess`).
- **`topic_prerequisites` / `concept_prerequisites`** — **directed** edges (`from` depends on `to`),
  with `weight` (propagation strength). Cycles rejected at seed time.
- **`problem_concepts`** — maps a problem to the concept(s) it exercises, with an evidence-attribution
  `weight`.
- **`model_versions`** — versioned global params (`mastery_threshold`, `struggle_threshold`,
  `hysteresis_margin`, `propagation_decay`, `max_propagation_depth`); exactly one `is_active`.
- **`concept_mastery`** — the live per-user probabilistic state (`p_mastery`, `status`,
  `last_submission_id`, `opportunities`), keyed `(user, concept, model_version)`. **Updated directly
  from evidence.**
- **`topic_mastery`** — derived aggregate of a topic's concept masteries.
- **`concept_mastery_history`** — append-only audit (`p_before`, `p_after`, `reason`,
  `submission_id`) for traceability and safe retrain/replace.
- **`recommendations`** — derived next-step (`reason`, `next_topic/concept/problem`, `explanation`).

### Mastery update algorithm (engine contract)
1. Submission reaches terminal verdict → evidence `{correct, max_time_ms, attempt_number}`.
2. For each `problem_concepts` of the problem (weighted): BKT update on `concept_mastery.p_mastery`
   (correctness primary; time/attempts modulate effective slip/guess). Bump `opportunities`.
3. **Directional propagation**: for each `concept_prerequisites` edge from the updated concept, apply
   a `weight × propagation_decay` adjustment to the prerequisite's `p_mastery` (failing Graphs lowers
   DFS). Bounded by `max_propagation_depth`; **no full bidirectional inference** (FR-009a).
4. Recompute `topic_mastery` aggregates for affected topics.
5. Recompute `status` with hysteresis margin (no flip on a single near-threshold submission, FR-016).
6. Write `concept_mastery_history` rows; set `submissions.evidence_applied_at`; refresh
   `recommendations`.

---

## 4. ORM integration inside Next.js — **Prisma** (decision) over Drizzle

**Decision: Prisma** (confirmed from research R5). Rationale vs Drizzle for this project:

| Concern | Prisma | Drizzle |
|---------|--------|---------|
| Migrations / schema evolution (model_versions, additive Bayesian tables) | First-class `prisma migrate` with shadow-DB diffing — matches the "versionable model without destructive migration" requirement | Lighter `drizzle-kit`; less guard-railed |
| `jsonb` params, enums, partial relations | Native typed support, generated client types | Native, but more manual typing |
| Transactions for the idempotent mastery update | `prisma.$transaction([...])` / interactive tx — clean | Supported via `db.transaction` |
| Team familiarity / hackathon speed | Higher-level, faster to wire in App Router | Faster cold runtime, but more boilerplate |

Drizzle remains a valid alternative (lower runtime overhead, raw-SQL ergonomics for the numeric BKT
math); if profiling shows Prisma client overhead matters on the Fargate task, the data-access layer
(`lib/db`) is the single place to swap it.

### Where Prisma lives (Principle I & IV)
- `prisma/schema.prisma` generated/maintained to mirror `schema.dbml` (snake_case tables via
  `@@map`, integer autoincrement PKs).
- **`lib/db`** is the *only* module that imports the Prisma client (single data-access layer); UI,
  API routes, the evaluation boundary, and the Bayesian engine call repository functions here, never
  raw Prisma queries (Principle I, Principle IV).
- A single `PrismaClient` singleton (guarded against hot-reload duplication in dev).
- `DATABASE_URL` injected at runtime from Secrets Manager (Principle II) — never in the bundle.

### Interaction patterns
- **Synchronous submit** (`POST /api/submissions`): repository creates the `submissions` row
  (`pending`, computed `attempt_number`), the evaluation boundary submits to Judge0 and persists
  `verdicts` rows with `judge0_token`, then awaits resolution (≤30 s). On terminal verdict the
  mastery update runs in **one `prisma.$transaction`** with the `evidence_applied_at` guard so a
  concurrent poller/callback can't double-apply (FR-009).
- **Disconnect / async completion** (FR-007): a lightweight poller (or Judge0 `callback_url`) looks
  up `verdicts.judge0_token`, updates rows, flips `submissions.status`, and runs the same guarded
  transaction — so the verdict + mastery land even if the request was abandoned.
- **Roadmap read** (`GET /api/roadmap`): repository joins `topic_mastery` + `concept_mastery` for the
  active `model_version`, plus `concept_prerequisites`, to assemble nodes/edges/statuses and the
  current `recommendations` row.
- **Retrain/replace model**: insert a new `model_versions` row, recompute masteries into rows keyed
  by the new version (old rows retained), then flip `is_active` — no destructive migration
  (Principle IV).

### Indexing summary (performance)
`submissions(user_id, problem_id)`, `submissions(status)`, unique
`submissions(user_id, problem_id, attempt_number)`, unique `verdicts(judge0_token)`,
`verdicts(submission_id)`, unique mastery keys `(user, concept|topic, model_version)`.
