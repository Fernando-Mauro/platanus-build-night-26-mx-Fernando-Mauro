<!-- SPECKIT START -->
Active feature: **Adaptive Learning Platform** (`001-adaptive-learning-platform`).
Read the current implementation plan and its design artifacts for technologies, project
structure, contracts, and constraints:

- Plan: `specs/001-adaptive-learning-platform/plan.md`
- Spec: `specs/001-adaptive-learning-platform/spec.md`
- Research: `specs/001-adaptive-learning-platform/research.md`
- Data model: `specs/001-adaptive-learning-platform/data-model.md`
- Contracts: `specs/001-adaptive-learning-platform/contracts/` (api, judge0-boundary, infra)
- Quickstart: `specs/001-adaptive-learning-platform/quickstart.md`

Stack: Next.js 15 (App Router, unified frontend + API Routes) on Amazon ECS Fargate + ALB,
Amazon RDS PostgreSQL (Prisma), self-hosted Judge0 on EC2 (private, SG-isolated), AWS CDK (TS) IaC.
Bayesian knowledge model: two-layer (Concepts→Topics) BKT + directional prerequisite propagation.
Honor the project constitution (`.specify/memory/constitution.md`): modular Next.js, least-privilege
AWS + Secrets Manager, isolated evaluation boundary as the only Judge0 caller, versioned mastery data.
<!-- SPECKIT END -->
