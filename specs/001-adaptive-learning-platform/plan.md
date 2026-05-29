# Implementation Plan: Adaptive Learning Platform

**Branch**: `001-adaptive-learning-platform` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-adaptive-learning-platform/spec.md`

## Summary

A programming-learning platform where learners register, see a roadmap of topics, solve coding
problems in an integrated editor, and submit them for evaluation against test cases. Behind the
scenes a two-layer Bayesian knowledge model (concept nodes under topic nodes) updates each learner's
mastery probabilities from submission evidence and adapts the roadmap to recommend prerequisites
when a learner struggles.

**Technical approach**: A single Next.js (App Router) application is the unified frontend + backend;
its API Routes (Node.js) run the Bayesian inference and own all data and evaluation access. Code
evaluation is delegated to a self-hosted Judge0 instance behind a single isolated evaluation module.
Persistence (users, content, probabilistic mastery state) lives in PostgreSQL on Amazon RDS. The
whole stack is provisioned 100% by CLI via AWS CDK (TypeScript).

**Key deployment decision (deviation from original input, approved):** AWS Amplify Hosting SSR
compute cannot attach to a VPC and has no static egress IPs, so it cannot reach a *private* RDS or
*private* Judge0 by security-group allow-list — which Constitution Principle III (strict evaluation
isolation) requires. The Next.js app is therefore deployed as a container on **Amazon ECS Fargate
behind an Application Load Balancer**, with its tasks running in private subnets inside the VPC. This
keeps the unified Next.js backend while letting RDS and Judge0 remain fully private and SG-restricted
(reachable only from the Fargate task security group). See Complexity Tracking.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (Next.js App Router); TypeScript for AWS CDK.

**Primary Dependencies**: Next.js 15 (App Router, `output: "standalone"`), React 19, Auth.js
(NextAuth) for session auth, Prisma ORM (PostgreSQL), Monaco Editor (`@monaco-editor/react`) for the
code editor, a custom Bayesian Knowledge Tracing + directional-propagation engine (Node.js),
AWS CDK v2 for IaC. Judge0 (self-hosted) as the evaluation engine.

**Storage**: Amazon RDS for PostgreSQL (application data: learners, topics, concepts, problems,
test cases, submissions, versioned mastery state, knowledge-model parameters). Judge0 manages its
own internal Postgres + Redis on the EC2 host (separate from the application DB).

**Testing**: Vitest (unit — Bayesian engine, evaluation boundary with Judge0 mocked), Playwright
(end-to-end — submit/verdict flow, roadmap adaptation).

**Target Platform**: Linux containers on Amazon ECS Fargate (web app, behind an ALB) + Amazon EC2 Ubuntu 22.04 LTS
(Judge0). US-region AWS account.

**Project Type**: Web application — unified Next.js frontend + backend (single deployable) plus an
isolated evaluation service (Judge0) and an IaC package.

**Performance Goals**: Verdict in < 10 s for typical submissions; hard 30 s wall-clock submission
timeout (FR-005a, SC-001). Roadmap reflects the latest submission within one refresh (SC-004).

**Constraints**: Submitted code is untrusted and MUST be isolated (Judge0 private, sandboxed,
enforced time/memory limits); evaluation MUST fail closed; mastery updates MUST be idempotent per
submission. No secrets in the repo or client bundle; least-privilege IAM (Principle II).

**Scale/Scope**: Hackathon MVP for individual self-paced learners; single Judge0 instance
(t3.medium minimum); content pre-seeded. Order of hundreds of learners, not a load-test target.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|-----------|--------|------------------------|
| **I. Clean & Modular Next.js Frontend** | PASS | Feature-oriented layout (`features/roadmap`, `features/problems`, `features/evaluation`, `features/knowledge`). Components are presentational; all domain logic (auth, evaluation, Bayesian inference, data access) lives in services/server-only modules. UI never touches Judge0, RDS, or the AWS SDK directly. |
| **II. Secure & Optimized AWS Deployment** | PASS (with noted operator-credential exception) | DB credentials and the Judge0 auth token live in AWS Secrets Manager, injected as env vars at runtime — never committed, never in the client bundle. Only `NEXT_PUBLIC_*` (non-sensitive) reaches the browser. Each component runs under a scoped IAM role (ECS Fargate task role, EC2 instance role for SSM); no wildcard actions/resources. The `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from the local env are **operator CDK-deploy credentials**, not runtime app credentials — documented exception, not a runtime secret. |
| **III. Isolated Evaluation Layer (Judge0)** | PASS | A single `features/evaluation/judge0-client` module is the only code that talks to Judge0. Judge0 runs on a private EC2 instance whose security group accepts traffic **only** from the ECS Fargate task SG. Untrusted code is sandboxed by Judge0 with enforced time/memory limits; the boundary fails closed (30 s timeout → limit-exceeded/error, never a silent pass) and is unit-tested with Judge0 mocked. |
| **IV. Structured Data for the Bayesian Knowledge Model** | PASS | Schema models Concepts and Topics as first-class nodes, prerequisite edges, problem→concept mappings, and versioned per-learner concept mastery. Evaluation outcomes feed the model through one defined, idempotent update path traceable to the triggering submission. Model parameters are versioned for retrain/replace without destructive migration. All model reads/writes go through a dedicated data-access layer. |

**Gate result: PASS.** One justified deviation (ECS Fargate instead of Amplify Hosting) is recorded
in Complexity Tracking; it strengthens, not weakens, Principle III.

## Project Structure

### Documentation (this feature)

```text
specs/001-adaptive-learning-platform/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API + Judge0 + IaC contracts)
│   ├── api.md
│   ├── judge0-boundary.md
│   └── infra.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (already created)
└── tasks.md             # Phase 2 output (/speckit-tasks - NOT created here)
```

### Source Code (repository root)

```text
app/                              # Next.js App Router (routes + pages)
├── (auth)/                       # sign-in / register routes
├── (app)/roadmap/                # roadmap view (Story 2)
├── (app)/topics/[topicId]/       # topic → problem list (Story 2)
├── (app)/problems/[problemId]/   # editor + submit (Story 1)
└── api/                          # unified backend (Node.js runtime)
    ├── auth/[...nextauth]/        # Auth.js
    ├── submissions/               # POST submit (sync, 30s budget), GET history
    ├── roadmap/                   # GET adaptive roadmap + recommendations
    └── topics/ , problems/        # content reads

features/                         # feature-oriented domain modules (Principle I)
├── auth/                         # session helpers, guards
├── roadmap/                      # roadmap assembly + recommendation logic
├── problems/                     # problem/test-case access
├── evaluation/                   # ISOLATED evaluation boundary (Principle III)
│   ├── judge0-client.ts          # the ONLY caller of Judge0
│   ├── evaluate.ts               # submit → normalized verdict, fail-closed, 30s
│   └── verdict.ts                # normalized verdict types
└── knowledge/                    # Bayesian engine (Principle IV)
    ├── bkt.ts                    # concept-level mastery update from evidence
    ├── propagate.ts              # directional propagation along prereq edges
    └── recommend.ts              # mastery → next-step recommendation

lib/
├── db/                           # Prisma client + data-access layer (only DB caller)
└── config/                       # env/secret loading (server-only)

prisma/
└── schema.prisma                 # tables for entities in data-model.md

infra/                            # Infrastructure as Code (Principle II)
├── bin/app.ts                    # CDK entrypoint
├── lib/network-stack.ts          # VPC, subnets, NAT, security groups
├── lib/data-stack.ts             # RDS PostgreSQL + Secrets Manager
├── lib/judge0-stack.ts           # EC2 t3.medium + user-data (Docker/Judge0)
├── lib/app-stack.ts              # ECR + ECS Fargate service + ALB + IAM
└── scripts/judge0-userdata.sh    # cgroup v1 + Docker + docker-compose + Judge0

tests/
├── unit/                         # bayesian engine, evaluation boundary (Judge0 mocked)
├── integration/                  # api routes against a test DB
└── e2e/                          # Playwright: submit→verdict, roadmap adaptation
```

**Structure Decision**: Single unified Next.js application (frontend + API Routes backend) following
the feature-oriented layout required by Principle I, with the evaluation boundary and Bayesian engine
as isolated `features/` modules and a dedicated `lib/db` data-access layer. Infrastructure is a
separate `infra/` CDK package so deployment is fully CLI-driven and reviewable as code (Principle II).
Judge0 is operated as an external service reached only through `features/evaluation` (Principle III).

## Complexity Tracking

| Violation / Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------------------|------------|--------------------------------------|
| ECS Fargate + ALB instead of Amplify Hosting (deviates from input #1) | Amplify Hosting SSR compute cannot attach to a VPC and has no static egress IPs, so it cannot reach a private RDS / private Judge0 by SG allow-list. ECS Fargate tasks run inside the VPC's private subnets and can, keeping the data + evaluation tiers fully private. | Keeping Amplify would force RDS and Judge0 to be internet-exposed and relax their security groups (no IP-based isolation possible), directly violating Principle III (strict evaluation isolation) and weakening Principle II. App Runner + VPC Connector was the earlier candidate but the user finalized ECS Fargate for fuller control (ALB, task sizing, VPC-native networking). User approved this deviation. |
| Local `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` for deploy | Per input #4, the CDK script assumes operator credentials already in the local environment to provision infra. | These are the human operator's deploy-time CLI credentials, not runtime app secrets. Runtime components use scoped IAM roles + Secrets Manager, so this does not violate Principle II's runtime-secret rules. |
