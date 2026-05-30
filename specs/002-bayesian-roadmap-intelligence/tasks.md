# Tasks: Bayesian Roadmap Intelligence + Cognito Auth

**Feature**: `002-bayesian-roadmap-intelligence` | **Input**: plan.md, spec.md, data-model.md, contracts/, research.md

**Strategy**: Auth-first, then the adaptive core — layered on the deployed feature-001 skeleton
(ECS Fargate + ALB, RDS PostgreSQL, Judge0 EC2, live in us-east-1). Phases 1–2 are the already-shipped
skeleton (kept here for continuity, all `[X]`). Phase 3 inserts Cognito auth. Phase 4 builds the
hardcoded seed, the Bayesian engine, the ECS→EC2 Judge0 submission path, and the real-time roadmap UI.

> **Story legend** (spec.md):
> US1 = Mastery updates immediately after each verdict (P1) ·
> US2 = Aggressive learning rate makes roadmap visibly reactive (P1) ·
> US3 = <40% gates advanced topic + suggests prerequisite reinforcement (P1).
> Auth is a prerequisite enabler (no story label).

> **Key decisions** (plan/research): Auth.js (NextAuth) Cognito provider (not Amplify Auth);
> JIT `users` upsert by `cognito_id` in the sign-in callback (no post-confirmation Lambda);
> bounded linear mastery update (±15/competency, equal split, clamp 0–100); 40/45 hysteresis;
> 50% cold start; 5-competency chain + 10 seed problems; tuning in `model_versions.params`.

---

## Phase 1: Local Setup & Walking Skeleton — ✅ COMPLETE (feature 001)

- [X] T001 docker-compose.dev.yml (local Postgres + Judge0), env loader, Prisma client, `/api/ping`.
- [X] T002 Next.js app scaffold + full Vértice frontend (Login/Home/Problems/Roadmap/Workspace) — build-verified.

## Phase 2: AWS Infrastructure Deployment — ✅ COMPLETE (feature 001)

- [X] T003 CDK Network/Data/Judge0/App stacks deployed to us-east-1 (VPC, RDS, Judge0 EC2 t3.small, ECS Fargate + ALB).
- [X] T004 Skeleton validated: ALB `/api/ping` → `status: ok, db: ok, judge0: ok` (Checkpoint 2 passed).

**🛑 CHECKPOINT 2 — passed.** Skeleton live in AWS.

---

## Phase 3: Authentication with Cognito (NEW)

**Goal**: Real user auth via Amazon Cognito; learners register/sign in through the existing Vértice
screens; first auth creates the matching `users` row in RDS keyed by `cognito_id` (referential
integrity for all mastery data). Builds on contracts/auth.md + contracts/cognito-infra.md.

### Infrastructure (CDK)

- [ ] T005 Implement `infra/lib/auth-stack.ts`: Cognito **User Pool** (email sign-in + verification, password policy) + **User Pool App Client** (`generateSecret: true`) + **Identity Pool** federating the pool; store the client secret in Secrets Manager; output `UserPoolId`, `UserPoolClientId`, `IdentityPoolId`, `CognitoIssuerUrl`.
- [ ] T006 Wire `Vertice-Auth` into `infra/bin/app.ts` and pass Cognito outputs to `AppStack`.
- [ ] T007 Update `infra/lib/app-stack.ts`: inject `COGNITO_ISSUER`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID` (env) and `COGNITO_CLIENT_SECRET` + `AUTH_SECRET` (Secrets Manager) into the Fargate task definition.
- [ ] T008 ⚠️ OPERATOR/DEPLOY: `cd infra && cdk deploy Vertice-Auth && cdk deploy Vertice-App` (creates Cognito, redeploys the task with auth env).

### Backend auth + DB sync (Next.js)

- [ ] T009 Add `users.cognito_id` (unique, nullable→backfill) to `prisma/schema.prisma`; make local `email`/`password` optional; create a migration.
- [ ] T010 Implement Auth.js (NextAuth) in `app/api/auth/[...nextauth]/route.ts` + `features/auth/auth.config.ts` with the **Cognito provider** (issuer/clientId/clientSecret from env; JWT cookie session).
- [ ] T011 Implement `features/auth/jit-sync.ts` + `lib/db` user repository: idempotent **upsert by `cognito_id`** (create email/display_name), returning internal `userId`; called from the Auth.js sign-in/jwt callback (contracts/auth.md).
- [ ] T012 [P] Implement `features/auth/session.ts`: server-side session helpers + route guards; attach `session.user.id` (internal) and `cognitoId`.
- [ ] T013 Add server-side guards so `/roadmap`, `/problems/*`, `/workspace`, and `POST /api/submissions` require an authenticated session (redirect to `/login`).

### Frontend login/register

- [ ] T014 Wire the existing `features/auth/Login.tsx` UI to real Auth.js sign-in; add a register flow (Cognito sign-up + email verification) in `app/(auth)/`.
- [ ] T015 [P] Replace the mock `USER` in the header/menu with the authenticated session user; wire logout to Auth.js sign-out.

**🛑 CHECKPOINT 3 — HUMAN VALIDATION**: Register a new user on the deployed ALB URL → verify the Cognito account is created, email verification works, and a `users` row with `cognito_id` appears in RDS. Stop for human sign-off before Phase 4.

---

## Phase 4: Core Logic — Seed, Bayesian Engine, Judge0 Submission, Real-time Roadmap

**Goal**: The adaptive product — hardcoded seed in RDS, the mastery engine driven by Judge0 verdicts
over the ECS→EC2 path, and a roadmap UI that visibly reacts to probability changes in real time.

### Data foundation (schema + seed)

- [ ] T016 Expand `prisma/schema.prisma` for the Bayesian model (competencies, `concept_prerequisites`, `problem_concepts`, `concept_mastery`, `topic_mastery`, `model_versions` with `params` jsonb, `recommendations`); migrate. (data-model.md)
- [ ] T017 Build the data-access layer in `lib/db` for competencies, mastery (read/write), tuning params, and recommendations — the only Prisma caller (Principle I/IV).
- [ ] T018 Seed RDS in `prisma/seed.ts`: the **5-competency linear chain** (Arreglos → Loops/Hashing → Recursión → Árboles → Grafos), **10 hardcoded problems** (~2/competency) with visible + hidden test cases and Judge0 language ids, and one active `model_versions` row with the demo tuning (`±15`, gate 40/45, coldStart 50). Deterministic. (FR-016)
- [ ] T019 Implement `lib/db` cold-start helper: create 50% `concept_mastery` for all competencies on first learner sync (FR-015); called from `jit-sync` (T011).

### Bayesian engine (US1 + US2)

- [ ] T020 [P] [US1] Implement `features/knowledge/update.ts`: bounded linear update — `base = pass? +15 : −15`, split equally across the problem's competencies (`base / nCompetencies`), clamp [0,100], set `last_submission_id`; reads tuning from `model_versions.params`. (FR-003/004/006/007/013)
- [ ] T021 [P] [US1] Implement topic-mastery aggregation in `features/knowledge` (mean of competencies) feeding `topic_mastery`. (FR-008)
- [ ] T022 [US1] Implement the idempotent apply path in `lib/db` guarded by `submissions.evidence_applied_at` so a verdict updates mastery exactly once; no update on non-verdict/error. (FR-005/014/017)
- [ ] T023 [P] [US1] Unit-test the engine in `tests/unit/knowledge.test.ts`: pass/fail deltas, equal multi-competency split (−15→−7.5×2), clamping, idempotency, and SC-002 (50→35→20 over two fails).

### Judge0 submission integration on AWS (US1 — ECS → EC2)

- [ ] T024 [US1] Implement the full evaluation in `features/evaluation/evaluate.ts` (batch submit to Judge0, await ≤30s, normalize verdict, fail-closed) using `JUDGE0_URL` (private EC2) — confirm the Fargate task SG → Judge0 SG path works in AWS, not just locally.
- [ ] T025 [US1] Implement `POST /api/submissions` (authenticated): persist submission/verdicts, run `evaluate`, then run the mastery update (T020–T022) once; return verdict + `masteryDelta` + `gating`. (contracts/mastery-api.md)
- [ ] T026 [US1] Wire `features/workspace/Workspace.tsx` to real submit (replace the mock Running→verdict sequence with the `/api/submissions` call + loading state).

### Adaptive gating & recommendations (US3)

- [ ] T027 [P] [US3] Implement `features/knowledge/gating.ts`: ±5 hysteresis — lock dependent advanced topic when topic mastery `< 40`, re-unlock only when `> 45`. (FR-009/011/012)
- [ ] T028 [P] [US3] Implement `features/knowledge/recommend.ts`: when a topic is gated, recommend a prerequisite reinforcement problem (or easier same-topic if no prereq). (FR-010)
- [ ] T029 [US3] Implement `GET /api/roadmap` (authenticated): topics with derived mastery + status (with hysteresis), competencies' mastery, and the current recommendation. (contracts/mastery-api.md, FR-015)
- [ ] T030 [P] [US3] Unit-test gating/recommendation in `tests/unit/gating.test.ts`: lock<40, no-unlock-at-40, unlock>45, prerequisite-vs-easier selection.

### Real-time Roadmap UI (US2)

- [ ] T031 [US2] Wire `features/roadmap/Roadmap.tsx` + `features/home/Home.tsx` to `GET /api/roadmap` (replace mock `lib/data.ts`); render live per-competency/topic mastery, locked badges, and the recommended next step.
- [ ] T032 [US2] After a submission verdict, refresh the roadmap so the mastery change and any new lock/recommendation appear immediately (≤ one refresh, SC-001/SC-003); surface the `masteryDelta` from the submission response as a visible cue ("Recursión 50% → 35%").
- [ ] T033 [P] [US2] Make the aggressive learning rate visible: ensure 1–2 fails produce a large, animated bar change in the UI (driven by real data, not mock).

---

## Phase 5: Polish & Cross-Cutting

- [ ] T034 [P] Verify security posture: Cognito client secret + AUTH_SECRET only in Secrets Manager; only `NEXT_PUBLIC_*` Cognito ids client-side; no public RDS/Judge0 ingress; no `*` IAM. (Principle II/III)
- [ ] T035 [P] Playwright E2E in `tests/e2e/`: register → login → solve → fail Recursión → Árboles locks + prerequisite recommended → recover >45% → Árboles unlocks (the demo script in quickstart.md).
- [ ] T036 [P] Confirm SC-008: changing `model_versions.params` (learning rate, 40/45, cold start) changes behavior with no code change.
- [ ] T037 [P] Update `quickstart.md`/`CLAUDE.md` with final Cognito + engine notes; ensure demo is repeatable from a fresh learner.

---

## Dependencies & execution order

- **Phase 3 → CHECKPOINT 3 → Phase 4 → Phase 5** (auth before core, per the user's ordering).
- Phase 3: T005→T006→T007→T008 (infra chain); T009 blocks T011; T010+T011 block T012/T013/T014.
- Phase 4: T016 blocks T017/T018/T019; T020+T021 block T022; T022 blocks T025; T024 blocks T025; T025 blocks T026; T016 blocks T027/T028; T027+T028 block T029; T029 blocks T031; T025 blocks T032.
- Phase 5 after Phase 4.

## Parallel opportunities

- Phase 3: `[P]` T012 alongside T013/T014 once T010/T011 land.
- Phase 4: `[P]` T020 + T021 (engine pure fns); T023 + T030 (tests) beside their impl; T027 + T028 (gating/recommend); T033 alongside T031/T032.
- Phase 5: T034–T037 all `[P]`.

## Story coverage

- **US1** (per-verdict update): T020, T021, T022, T023, T024, T025, T026
- **US2** (reactive roadmap): T031, T032, T033
- **US3** (gating + reinforcement): T027, T028, T029, T030
- **Auth enabler**: T005–T015

## MVP scope

**Auth (Phase 3)** is the prerequisite milestone. The product MVP is **US1 (mastery updates from real
Judge0 verdicts on AWS) + US3 (40% gating with prerequisite reinforcement)**; **US2 (real-time reactive
UI)** is what makes the demo land. Seed (T018) + engine (T020–T022) + gating (T027–T029) are the core
of the "intelligence."
