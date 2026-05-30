# Implementation Plan: Bayesian Roadmap Intelligence + Cognito Auth

**Branch**: `002-bayesian-roadmap-intelligence-competencies` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-bayesian-roadmap-intelligence/spec.md`

## Summary

Two coupled workstreams, sequenced auth-first per the user's decision:

1. **Real user authentication via Amazon Cognito** (prerequisite). A Cognito **User Pool** + **Identity
   Pool** (provisioned by CDK) back a Login/Registro flow in the Next.js app using **Auth.js (NextAuth)
   with the Cognito provider**. On first successful registration/sign-in, the app **just-in-time
   upserts** a row into the PostgreSQL `users` table keyed by `cognito_id`, so the Bayesian model's
   per-learner state has referential integrity.
2. **Bayesian roadmap intelligence** (the spec's core). Per-verdict mastery updates over a 5-competency
   linear chain, aggressive demo learning rate (±15/competency, equal multi-competency split), 40%
   gating with ±5 hysteresis, 50% cold-start prior, and a 10-problem seed — all keyed to the
   authenticated learner's `cognito_id`.

This plan layers on the deployed skeleton (ECS Fargate + ALB, RDS PostgreSQL, Judge0 EC2 — all from
feature 001, live in us-east-1) and the two-layer knowledge model.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 (Next.js 15 App Router); TypeScript for AWS CDK v2.

**Primary Dependencies**: Next.js 15, Auth.js (NextAuth v5) `@auth/core` Cognito provider, Prisma
(PostgreSQL), `aws-cdk-lib` (adds `aws-cognito`). Judge0 (existing) for verdicts that feed the engine.

**Storage**: Amazon RDS PostgreSQL. New/changed tables: `users` gains `cognito_id` (unique); plus the
Bayesian schema (competencies, problem↔competency links, per-learner mastery, tuning params, seed).

**Auth**: Amazon Cognito User Pool (email/password, email verification) + Identity Pool. Auth.js holds
the server-side session (HTTP-only cookie); Cognito is the identity provider.

**Testing**: Vitest (mastery engine pure functions, JIT-sync upsert with Prisma mocked), Playwright
(register→login→solve→roadmap-adapts E2E).

**Target Platform**: Existing ECS Fargate service behind ALB (us-east-1); CDK adds an Auth stack.

**Performance Goals**: Mastery reflects a verdict within one roadmap refresh (SC-001); login→app in a
normal web flow.

**Constraints**: Cognito secrets (app client id/secret) via Secrets Manager → Fargate task (no secrets
in bundle/repo, Principle II). RDS stays private; the JIT upsert runs server-side from Fargate (which
already has RDS access) — **no new Lambda in the VPC**. Mastery updates idempotent per submission.

**Scale/Scope**: Hackathon demo; single Cognito pool; 10 seeded problems; hundreds of learners.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|-----------|--------|------------------------|
| **I. Clean & Modular Next.js Frontend** | PASS | Auth in `features/auth` (Auth.js config, Cognito provider, session helpers); mastery engine in `features/knowledge`; UI stays presentational. No component talks to Cognito/RDS directly — only via `lib/auth` + `lib/db`. |
| **II. Secure & Optimized AWS Deployment** | PASS | Cognito app-client secret + `AUTH_SECRET` in Secrets Manager, injected to the Fargate task; only `NEXT_PUBLIC_*` (Cognito pool/client *ids*, non-sensitive) reach the browser. Cognito resources via CDK (IaC); scoped IAM; no wildcards. |
| **III. Isolated Evaluation Layer (Judge0)** | PASS | Unchanged — evaluation still flows only through `features/evaluation`. Auth/mastery don't touch Judge0 except consuming its normalized verdict. |
| **IV. Structured Data for the Bayesian Knowledge Model** | PASS | `cognito_id` gives every mastery/submission row a stable learner identity (referential integrity the user explicitly required). Competencies/mastery/tuning are versioned, first-class, accessed only via `lib/db`. |

**Gate result: PASS.** No new deviations. The JIT-sync-over-Lambda choice *strengthens* Principle III/II
(no extra VPC compute, fewer privileged paths) and is recorded in Complexity Tracking as a noted choice.

## Project Structure

### Documentation (this feature)

```text
specs/002-bayesian-roadmap-intelligence/
├── plan.md              # This file
├── research.md          # Phase 0 (auth approach, sync strategy, engine formula)
├── data-model.md        # Phase 1 (cognito_id + Bayesian tables delta)
├── quickstart.md        # Phase 1 (Cognito env, register/login, demo script)
├── contracts/           # Phase 1
│   ├── auth.md          # Auth.js routes, session shape, JIT-sync callback contract
│   ├── cognito-infra.md # CDK User Pool + Identity Pool + outputs
│   └── mastery-api.md   # submit→update→roadmap behavior
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root) — additions to the existing tree

```text
app/
├── api/auth/[...nextauth]/route.ts   # Auth.js (NextAuth) handler — Cognito provider
└── (auth)/login, /register            # wire existing Login UI to real auth

features/
├── auth/
│   ├── auth.config.ts                 # NextAuth config: Cognito provider, callbacks
│   ├── jit-sync.ts                    # upsert users row by cognito_id (first login/register)
│   └── session.ts                     # server-side session helpers / guards
└── knowledge/                         # the Bayesian engine (spec core)
    ├── update.ts                      # per-verdict mastery update (±15, equal split, 0–100 clamp)
    ├── gating.ts                      # 40% lock / 45% unlock hysteresis
    └── recommend.ts                   # prerequisite reinforcement vs easier-same-topic

lib/
├── auth/                              # single Auth.js instance + helpers (only caller of authjs)
└── db/                                # data-access incl. users upsert + mastery repo (only Prisma caller)

prisma/
├── schema.prisma                      # + users.cognito_id (unique); + Bayesian tables
└── seed.ts                            # 5-competency chain + 10 problems + 50% priors

infra/lib/
└── auth-stack.ts                      # NEW: Cognito User Pool + Identity Pool + app client + secret
```

## Complexity Tracking

| Decision / Deviation | Why | Alternative rejected because |
|----------------------|-----|------------------------------|
| Auth.js (NextAuth) Cognito provider instead of Amplify Auth library | Server-side cookie sessions fit the App Router + Fargate SSR model and the data-access layering already chosen in 001; one session source of truth. | Amplify Auth is client-centric (Amplify configure, client token handling); adds an SDK whose strengths (hosting/datastore) we don't use since hosting is ECS. |
| JIT user upsert in the Auth.js sign-in callback instead of a Cognito post-confirmation Lambda | The app already reaches private RDS from Fargate and owns Prisma (`lib/db`); one idempotent upsert keyed on `cognito_id` covers both first registration and first login, with no new code path. | A post-confirmation Lambda would need VPC attachment to reach private RDS (extra infra, cold starts, the same Prisma-engine packaging issue), and wouldn't fire for admin-created users. Kept as a documented future option for non-interactive signups. |
