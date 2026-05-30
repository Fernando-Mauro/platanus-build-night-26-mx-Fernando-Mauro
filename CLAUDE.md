<!-- SPECKIT START -->
Active feature: **Bayesian Roadmap Intelligence + Cognito Auth** (`002-bayesian-roadmap-intelligence`).
Builds on the deployed feature 001 platform. Read the current plan and its design artifacts:

- Plan: `specs/002-bayesian-roadmap-intelligence/plan.md`
- Spec: `specs/002-bayesian-roadmap-intelligence/spec.md`
- Research: `specs/002-bayesian-roadmap-intelligence/research.md`
- Data model: `specs/002-bayesian-roadmap-intelligence/data-model.md`
- Contracts: `specs/002-bayesian-roadmap-intelligence/contracts/` (auth, cognito-infra, mastery-api)
- Quickstart: `specs/002-bayesian-roadmap-intelligence/quickstart.md`

Foundation (feature 001, deployed in us-east-1):
- Plan/contracts under `specs/001-adaptive-learning-platform/`.

Stack: Next.js 15 (App Router) on Amazon ECS Fargate + ALB, Amazon RDS PostgreSQL (Prisma),
self-hosted Judge0 on EC2 (private, SG-isolated), AWS CDK (TS) IaC.
Auth (002): Amazon Cognito (User Pool + Identity Pool via CDK) with Auth.js (NextAuth) Cognito
provider; first login JIT-upserts a `users` row keyed by `cognito_id` (no post-confirmation Lambda).
Bayesian engine (002): per-verdict bounded linear update (±15/competency, equal multi-competency
split, 0–100 clamp), 40%/45% hysteresis gating, 50% cold start, 5-competency linear chain + 10 seed
problems; tuning params configurable via `model_versions.params`.
Honor the constitution (`.specify/memory/constitution.md`): modular Next.js, least-privilege AWS +
Secrets Manager, isolated Judge0 boundary, versioned mastery data accessed only via `lib/db`.
<!-- SPECKIT END -->
