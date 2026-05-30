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

- [X] T005 Implement `infra/lib/auth-stack.ts`: Cognito **User Pool** (email sign-in + verification, password policy) + **User Pool App Client** (`generateSecret: true`) + **Identity Pool** federating the pool; store the client secret in Secrets Manager; output `UserPoolId`, `UserPoolClientId`, `IdentityPoolId`, `CognitoIssuerUrl`.
- [X] T006 Wire `Vertice-Auth` into `infra/bin/app.ts` and pass Cognito outputs to `AppStack`.
- [X] T007 Update `infra/lib/app-stack.ts`: inject `COGNITO_ISSUER`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID` (env) and `COGNITO_CLIENT_SECRET` + `AUTH_SECRET` (Secrets Manager) into the Fargate task definition.
- [ ] T008 ⚠️ OPERATOR/DEPLOY: `cd infra && cdk deploy Vertice-Auth && cdk deploy Vertice-App` (creates Cognito, redeploys the task with auth env).

### Backend auth + DB sync (Next.js)

- [X] T009 Add `users.cognito_id` (unique, nullable→backfill) to `prisma/schema.prisma`; make local `email`/`password` optional; create a migration.
- [X] T010 Implement Auth.js (NextAuth) in `app/api/auth/[...nextauth]/route.ts` + `features/auth/auth.config.ts` with the **Cognito provider** (issuer/clientId/clientSecret from env; JWT cookie session).
- [X] T011 Implement `features/auth/jit-sync.ts` + `lib/db` user repository: idempotent **upsert by `cognito_id`** (create email/display_name), returning internal `userId`; called from the Auth.js sign-in/jwt callback (contracts/auth.md).
- [X] T012 [P] Implement `features/auth/session.ts`: server-side session helpers + route guards; attach `session.user.id` (internal) and `cognitoId`.
- [X] T013 Add server-side guards so `/roadmap`, `/problems/*`, `/workspace`, and `POST /api/submissions` require an authenticated session (redirect to `/login`).

### Frontend login/register

- [X] T014 Wire the existing `features/auth/Login.tsx` UI to real Auth.js sign-in; add a register flow (Cognito sign-up + email verification) in `app/(auth)/`.
- [X] T015 [P] Replace the mock `USER` in the header/menu with the authenticated session user; wire logout to Auth.js sign-out.

**🛑 CHECKPOINT 3 — HUMAN VALIDATION**: Register a new user on the deployed ALB URL → verify the Cognito account is created, email verification works, and a `users` row with `cognito_id` appears in RDS. Stop for human sign-off before Phase 4.

---

## Phase 4: Core Logic — Seed, Bayesian Engine, Judge0 Submission, Real-time Roadmap

**Goal**: The adaptive product — hardcoded seed in RDS, the mastery engine driven by Judge0 verdicts
over the ECS→EC2 path, and a roadmap UI that visibly reacts to probability changes in real time.

### Data foundation (schema + seed)

- [X] T016 Expand `prisma/schema.prisma` for the Bayesian model. **Note:** implemented with a simplified **1:1 topic↔competency** model — competencies carry `prerequisiteId` (linear chain) instead of a separate `concept_prerequisites` table, and topic mastery is **derived** from the single competency (no separate `topic_mastery`/`recommendations` tables; recommendation is computed live). Migrated locally (`20260530_bayesian_engine`).
- [X] T017 Data-access layer in `lib/db`: `lib/db/knowledge.ts` (competencies, mastery read/write, tuning, recommendation/gating) + `lib/db/problems.ts` (list/detail) + `lib/db/submissions.ts` (idempotent apply). Only Prisma callers (Principle I/IV).
- [X] T018 Seed RDS in `prisma/seed.ts`: 5-competency linear chain + 10 problems (2/competency) + active `model_versions` demo tuning. Deterministic. (FR-016)
- [X] T019 Cold-start helper `ensureColdStartMastery(userId)` in `lib/db/knowledge.ts` (50% per competency); wired into `features/auth/jit-sync.ts` (best-effort). (FR-015)

### Bayesian engine (US1 + US2)

- [X] T020 [P] [US1] `features/knowledge/update.ts`: bounded linear update (`±15` equal split, clamp [0,100]); tuning via `features/knowledge/tuning.ts` from `model_versions.params`. (FR-003/004/006/007/013)
- [X] T021 [P] [US1] Topic mastery derived from the 1:1 competency in `getRoadmap` (no separate table needed in the simplified model). (FR-008)
- [X] T022 [US1] Idempotent apply path `applyMasteryDeltas` in `lib/db/submissions.ts` guarded by `submissions.evidence_applied_at` (re-checked inside the transaction); no update on non-real verdict. (FR-005/014/017)
- [X] T023 [P] [US1] Unit tests in `tests/unit/knowledge.test.ts` (pass/fail deltas, −15→−7.5×2 split, clamp, ERROR=no-op, SC-002 50→35→20). ⚠️ written; not yet run — see verification note.

### Judge0 submission integration on AWS (US1 — ECS → EC2)

- [X] T024 [US1] `features/evaluation/evaluate.ts`: batch submit to Judge0 + poll ≤28s, normalize verdict (PASSED/FAILED/LIMIT_EXCEEDED/ERROR), fail-closed. ⚠️ AWS SG path (Fargate→Judge0) not re-confirmed this session.
- [X] T025 [US1] `POST /api/submissions` (authenticated): persist → evaluate → apply mastery once → return verdict + `masteryDelta` + `gating`. (contracts/mastery-api.md)
- [X] T026 [US1] `features/workspace/Workspace.tsx` rewritten data-driven: fetches the problem, **editable code editor**, real `POST /api/submissions`, renders verdict + mastery delta + gating. `page.tsx` threads the selected `problemId` (roadmap nodes open their recommended problem). Build-verified.

### Adaptive gating & recommendations (US3)

- [X] T027 [P] [US3] `features/knowledge/gating.ts`: hysteresis — lock when `< 40`, unlock only when `> 45`, sticky dead-band in between (FR-009/011/012). Persisted via `ConceptMastery.status` in `getRoadmap`.
- [X] T028 [P] [US3] `features/knowledge/recommend.ts`: weakest prerequisite-gap reinforcement, else advance; easiest problem chosen by `pickEasiestProblemId`. (FR-010)
- [X] T029 [US3] `GET /api/roadmap` (authenticated): competencies with derived mastery + status (hysteresis) + current recommendation. (contracts/mastery-api.md, FR-015)
- [X] T030 [P] [US3] Unit tests in `tests/unit/gating.test.ts` (lock<40, no-unlock-at-40, unlock>45, weakest-gap vs advance vs null). ⚠️ written; not yet run.

### Real-time Roadmap UI (US2)

- [X] T031 [US2] `features/roadmap/Roadmap.tsx` + `features/home/Home.tsx` wired to `GET /api/roadmap` via `features/roadmap/useRoadmap.ts`; live per-competency mastery, locked badges, and the recommended next step (banner). Build-verified.
- [X] T032 [US2] Submission→refresh loop closed: `onSubmitted` bumps `refreshSignal` so the roadmap re-fetches after each verdict; the `masteryDelta` cue ("Recursión 50% → 35%") renders in the console. (SC-001/SC-003)
- [X] T033 [P] [US2] Animated mastery bars (`transition-all duration-700`) driven by real engine data — 1–2 fails produce a visible jump.

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
