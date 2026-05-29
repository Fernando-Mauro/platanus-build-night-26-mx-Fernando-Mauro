# Tasks: Adaptive Learning Platform (Walking Skeleton strategy)

**Feature**: `001-adaptive-learning-platform` | **Input**: plan.md, spec.md, data-model.md, contracts/, research.md

**Strategy**: Walking Skeleton — first prove the thinnest end-to-end slice runs both locally and in
AWS (frontend ↔ Next.js API ↔ PostgreSQL ↔ Judge0), with human checkpoints, before building the
core Bayesian + evaluation logic. Phases below follow the user-requested ordering, not the default
by-story ordering.

> **Deviation notes**
> - **Compute**: **ECS Fargate + ALB** is the final, confirmed compute choice (App Runner is
>   discarded). Tasks run in private VPC subnets; RDS + Judge0 are reachable only from the Fargate
>   task SG (Principle III). `plan.md`, `research.md`, and `contracts/` have been reconciled (T040).
> - **Frontend**: the design components (Login/Home/Problems/Roadmap/Workspace) were already
>   implemented and build-verified in a prior step — those tasks are marked `[X]`.

**Story legend** (from spec.md): US1 = Submit & evaluate code (P1) · US2 = Roadmap + mastery (P1) ·
US3 = Adaptive recommendation (P2) · US4 = Register / sign in (P1).

---

## Phase 1: Local Setup & Walking Skeleton (HIGH PRIORITY)

**Goal**: A developer can run `pnpm dev`, see the UI at `localhost:3000`, and hit a `/api/ping`
endpoint that proves live connectivity to a local PostgreSQL and a local Judge0.

- [ ] T001 Create `docker-compose.dev.yml` at repo root bringing up PostgreSQL 16 (port 5432) and the official Judge0 stack (server + worker + its own db/redis, port 2358), with a shared network and named volumes.
- [ ] T002 [P] Create `.env.example` and `.env.local` (gitignored) with `DATABASE_URL`, `JUDGE0_URL`, `JUDGE0_AUTHN_TOKEN`, `AUTH_SECRET` for local dev (in `lib/config/`).
- [ ] T003 [P] Add server-only env loader/validator in `lib/config/env.ts` (fails fast if a required var is missing; never exposes secrets to the client).
- [ ] T004 Initialize Prisma in `prisma/schema.prisma` with the datasource (PostgreSQL) and a minimal `HealthCheck`/no-op model sufficient for a `SELECT 1`; add the singleton client in `lib/db/client.ts` (the only module importing PrismaClient).
- [ ] T005 [P] Add a minimal Judge0 health client in `features/evaluation/judge0-client.ts` exposing `pingJudge0()` (GET `/about` or `/languages` with `X-Auth-Token`) — the only module that calls Judge0.
- [ ] T006 Implement `GET /api/ping` in `app/api/ping/route.ts` that runs a DB round-trip via `lib/db` and `pingJudge0()`, returning `{ db: "ok"|err, judge0: "ok"|err, version }` (fails closed, no secret leakage).
- [X] T007 [P] [US4] Frontend auth screen implemented in `features/auth/Login.tsx` (design port — done).
- [X] T008 [P] [US2] Frontend roadmap + dashboard implemented in `features/home/Home.tsx`, `features/roadmap/Roadmap.tsx` (design port — done).
- [X] T009 [P] [US1] Frontend problems list + workspace implemented in `features/problems/Problems.tsx`, `components/ProblemList.tsx`, `features/workspace/Workspace.tsx` (design port — done).
- [X] T010 [P] App shell + routing implemented in `app/page.tsx`, `app/layout.tsx`, `lib/icons.tsx`, `lib/data.ts` (design port — done).
- [ ] T011 Add a tiny health widget or console log in the UI that calls `/api/ping` on load so the skeleton is visibly end-to-end in the browser.
- [ ] T012 Update `quickstart.md` local section with the `docker-compose.dev.yml` + `/api/ping` smoke steps.

**🛑 CHECKPOINT 1 — HUMAN VALIDATION**: Stop here. Human runs `docker compose -f docker-compose.dev.yml up -d` + `pnpm dev`, opens `localhost:3000`, and confirms `/api/ping` returns `db: ok` and `judge0: ok`. Do not proceed to Phase 2 until validated.

---

## Phase 2: AWS Infrastructure Deployment

**Goal**: The same walking skeleton runs in AWS — the containerized Next.js app on ECS Fargate
reaches a private RDS and a private Judge0 EC2, validated by the deployed `/api/ping`.

- [ ] T013 Initialize the AWS CDK (TypeScript) app in `infra/` (`cdk.json`, `bin/app.ts`, `package.json`), assuming `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are already in the environment (operator deploy creds only).
- [ ] T014 Implement `infra/lib/network-stack.ts`: VPC (2 AZs, public + private-with-egress subnets, NAT) and security groups (`fargateSg`, `rdsSg` ⟵ 5432 from `fargateSg` only, `judge0Sg` ⟵ 2358 from `fargateSg` only). No `0.0.0.0/0` on RDS/Judge0.
- [ ] T015 [P] Implement `infra/lib/data-stack.ts`: RDS PostgreSQL (private, encrypted, not public), credentials auto-generated into Secrets Manager (`appDbSecret`).
- [ ] T016 [P] Implement `infra/lib/judge0-stack.ts`: EC2 t3.medium (Ubuntu 22.04, private subnet, `judge0Sg`), instance role scoped to SSM + read of `judge0Secret`; wire `infra/scripts/judge0-userdata.sh`.
- [ ] T017 Write `infra/scripts/judge0-userdata.sh`: install Docker + Compose, set cgroup v1 GRUB params (`systemd.unified_cgroup_hierarchy=0 …`), reboot, then download official Judge0, inject `AUTHN_TOKEN`/passwords from Secrets Manager, `docker compose up -d` (per research R2).
- [ ] T018 Create a production `Dockerfile` for the Next.js app (multi-stage, `output: "standalone"`) and `.dockerignore`.
- [ ] T019 Implement `infra/lib/app-stack.ts`: ECR repo + **ECS Fargate** service behind an internet-facing ALB, tasks in private subnets with `fargateSg`; task role scoped to read `appDbSecret` + `judge0Secret`; runtime env (`DATABASE_URL`, `JUDGE0_URL`, `JUDGE0_AUTHN_TOKEN`, `AUTH_SECRET`) injected from Secrets Manager.
- [ ] T020 Build + push the Next.js image to ECR and run `cdk deploy` for all stacks (Network → Data → Judge0 → App).
- [ ] T021 Run Prisma migrate/health against RDS (one-off task or via the Fargate image) so `/api/ping` can reach the DB.

**🛑 CHECKPOINT 2 — HUMAN VALIDATION**: Stop here. Human hits the deployed ALB URL `/api/ping` and confirms `db: ok` + `judge0: ok` in AWS (skeleton works in production). Verify SGs have no public ingress on RDS/Judge0.

---

## Phase 3: Core Logic

**Goal**: Replace the skeleton with the real product — full schema, auth, isolated synchronous
evaluation, and the Bayesian adaptive engine wired to the UI.

### Data & Auth (foundational for the stories)

- [ ] T022 Expand `prisma/schema.prisma` to the full model from `data-model.md`/`schema.dbml` (users, topics, concepts, prerequisites, problems, test_cases, languages, submissions, verdicts, model_versions, concept/topic mastery, history, recommendations); add migrations.
- [ ] T023 [P] Build the data-access layer in `lib/db/` (repositories for learners, content, submissions, mastery) — the only place issuing Prisma queries (Principle I/IV).
- [ ] T024 [P] Create a content seed script in `prisma/seed.ts` (topics, concepts, weighted prerequisite edges, problem→concept mappings, problems + visible/hidden test cases, an active `model_versions` row).
- [ ] T025 [US4] Implement Auth.js (Credentials + DB sessions) in `app/api/auth/[...nextauth]/route.ts` + `features/auth/` server logic; wire the existing Login UI to real register/sign-in.

### US1 — Submit & evaluate (P1)

- [ ] T026 [US1] Implement the full evaluation boundary in `features/evaluation/evaluate.ts` + `verdict.ts`: batch-submit to Judge0, await with a hard 30 s budget, normalize statuses → `PASSED|FAILED|LIMIT_EXCEEDED|ERROR`, fail closed, no hidden-output leakage (contracts/judge0-boundary.md).
- [ ] T027 [US1] Implement `POST /api/submissions` (synchronous, ≤30 s) + `GET /api/submissions` history in `app/api/submissions/route.ts`, persisting `submissions`/`verdicts` with Judge0 tokens (`contracts/api.md`, FR-005a/007).
- [ ] T028 [P] [US1] Unit-test the evaluation boundary in `tests/unit/evaluate.test.ts` with Judge0 mocked: accepted-all, partial-fail, TLE/timeout, compile-error, outage (required before merge per constitution).
- [ ] T029 [US1] Wire `features/workspace/Workspace.tsx` to real submit (replace the mock Running→verdict sequence with the `/api/submissions` call + loading state).

### US3 — Bayesian adaptive engine (P2)

- [ ] T030 [P] [US3] Implement concept-level BKT update in `features/knowledge/bkt.ts` (correctness primary; time/attempts modulate slip/guess).
- [ ] T031 [P] [US3] Implement directional prerequisite propagation in `features/knowledge/propagate.ts` (weight × decay along edges, bounded depth; no full bidirectional inference — FR-009a).
- [ ] T032 [US3] Implement the idempotent mastery-update path (verdict → evidence → BKT → propagate → topic aggregate → hysteresis status → history) in `lib/db` + `features/knowledge/`, guarded by `submissions.evidence_applied_at` (FR-009/016).
- [ ] T033 [P] [US3] Unit-test the Bayesian engine in `tests/unit/knowledge.test.ts` (update monotonicity, propagation direction, idempotency, hysteresis no-flip).
- [ ] T034 [US3] Implement `features/knowledge/recommend.ts` (mastery + edges → next-step reason: PREREQUISITE_GAP / CONTINUE_TOPIC / EASIER_PROBLEM / NEW_TOPIC).

### US2 — Roadmap wired to real state (P1)

- [ ] T035 [US2] Implement `GET /api/roadmap` (+ `GET /api/topics`, `GET /api/problems/{id}`) assembling topic/concept mastery, edges, and the current recommendation from `lib/db` (contracts/api.md).
- [ ] T036 [US2] Wire `features/roadmap/Roadmap.tsx` + `features/home/Home.tsx` to `/api/roadmap` (replace mock `lib/data.ts` with live data); keep visuals identical.

---

## Phase 4: Polish & Cross-Cutting

- [ ] T037 [P] Verify security posture against `contracts/infra.md` checklist (no public RDS/Judge0 ingress, no `*` IAM, no secrets in repo/image/bundle) — Principle II/III.
- [ ] T038 [P] Add Playwright e2e in `tests/e2e/` covering the 5 quickstart smoke scenarios (register → roadmap → submit → verdict → prerequisite recommendation → disconnect persistence).
- [ ] T039 [P] Tune `model_versions.params` (mastery/struggle thresholds, hysteresis margin, propagation decay) and document defaults.
- [X] T040 [P] Reconcile docs to the final compute choice **ECS Fargate + ALB** (App Runner discarded): updated `plan.md`, `research.md` (R1/R6), `contracts/infra.md`, `contracts/judge0-boundary.md`, `data-model.md`, `quickstart.md`, `CLAUDE.md`.

---

## Dependencies & execution order

- **Phase 1 → CHECKPOINT 1 → Phase 2 → CHECKPOINT 2 → Phase 3 → Phase 4** (strict, walking-skeleton).
- Within Phase 1: T001 blocks T006; T004 blocks T006; T005 blocks T006. Frontend tasks T007–T010 are done; T011 needs T006.
- Within Phase 2: T014 blocks T015/T016/T019; T017 ⊂ T016; T018 blocks T019/T020; T020 blocks T021.
- Within Phase 3: T022 blocks T023/T024/T032/T035; T026 blocks T027/T029; T030+T031 block T032; T032 blocks T034/T035; T035 blocks T036.
- Phase 4 after Phase 3.

## Parallel opportunities

- Phase 1: `[P]` T002, T003, T005 together (distinct files); frontend T007–T010 already parallel-built.
- Phase 2: `[P]` T015 + T016 after T014 (separate stacks).
- Phase 3: `[P]` T023 + T024 after T022; T030 + T031 together; T028 + T033 (tests) alongside their impl.
- Phase 4: T037–T040 all `[P]`.

## MVP scope

The **Walking Skeleton itself (Phase 1 + Phase 2)** is the first demonstrable milestone — proving the
full architecture end-to-end in both environments. The product MVP is **US1 (submit & evaluate) + US2
(roadmap)** completed in Phase 3; **US3 (adaptive recommendation)** is the differentiating follow-on.
