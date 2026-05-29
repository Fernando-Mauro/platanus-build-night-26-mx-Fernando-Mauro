<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Bump rationale: Initial ratification — template placeholders replaced with concrete,
  project-specific principles. First versioned constitution → 1.0.0 (MAJOR baseline).

Modified principles (placeholder → concrete):
  - [PRINCIPLE_1_NAME] → I. Clean & Modular Next.js Frontend
  - [PRINCIPLE_2_NAME] → II. Secure & Optimized AWS Deployment
  - [PRINCIPLE_3_NAME] → III. Isolated Evaluation Layer (Judge0)
  - [PRINCIPLE_4_NAME] → IV. Structured Data for the Bayesian Knowledge Model
  - [PRINCIPLE_5_NAME] → (removed — user requested 4 principles)

Added sections:
  - Technology & Architecture Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections:
  - Fifth core principle slot (reduced from 5 → 4 per user direction)

Templates requiring updates:
  - .specify/templates/plan-template.md           ✅ reviewed — Constitution Check is
                                                     gate-based and references this file generically; no edit needed
  - .specify/templates/spec-template.md            ✅ reviewed — no constitution-coupled
                                                     sections; no edit needed
  - .specify/templates/tasks-template.md           ✅ reviewed — task categories already
                                                     cover frontend/deploy/eval/data; no edit needed
  - .specify/templates/checklist-template.md       ✅ reviewed — generic; no edit needed

Follow-up TODOs:
  - build-night-project.json still has placeholder name/oneliner/description.
    Constitution uses the working title "Competitive Programming Platform"; align
    once the official project name is set.
-->

# Competitive Programming Platform Constitution

## Core Principles

### I. Clean & Modular Next.js Frontend

The frontend MUST be built in Next.js with a clean, modular, feature-oriented architecture.
- Code MUST be organized by feature/domain (e.g. `features/problems`, `features/evaluation`,
  `features/profile`), not by file type alone; shared primitives live in a dedicated `shared`/`ui`
  layer.
- Components MUST be presentational and free of business logic; data fetching, evaluation calls,
  and domain rules MUST live in dedicated hooks, server actions, or service modules — never inline
  in JSX.
- No direct coupling between UI components and external systems (Judge0, AWS SDK, database).
  All access goes through typed service/adapter modules.
- Cross-cutting concerns (auth, telemetry, theming) MUST be expressed as composable providers or
  middleware, not duplicated per page.

**Rationale**: A competitive-programming platform iterates fast on problems, scoring, and UX.
Strict modularity keeps the blast radius of changes small and lets the evaluation and data layers
evolve independently of the UI.

### II. Secure & Optimized AWS Deployment

Deployment to AWS MUST be reproducible, least-privilege, and secret-safe.
- Secrets and configuration MUST be supplied via environment variables sourced from a managed store
  (AWS Secrets Manager / SSM Parameter Store). Secrets MUST NEVER be committed to the repository,
  baked into images, or exposed to the client bundle.
- Every runtime component MUST run under a scoped IAM role granting only the permissions it needs
  (least privilege); wildcard (`*`) actions/resources are prohibited unless explicitly justified in
  the plan's Complexity/Tradeoffs section.
- Server-only secrets MUST stay server-side; only variables explicitly prefixed for the client
  (e.g. `NEXT_PUBLIC_*`) may reach the browser, and they MUST contain no sensitive data.
- Builds MUST be optimized for the target (caching, static where possible, minimal image/bundle
  size) and infrastructure changes MUST be declared as code and reviewable.

**Rationale**: The platform handles user-submitted code execution and learner data; a leaked
credential or over-broad role is a critical breach. Least-privilege IAM and externalized secrets
are non-negotiable safety boundaries.

### III. Isolated Evaluation Layer (Judge0)

All code-evaluation logic MUST be isolated behind a single dedicated boundary that owns
communication with Judge0.
- A single evaluation service/module MUST be the only component permitted to call Judge0; no other
  part of the system constructs Judge0 requests directly.
- The evaluation boundary MUST expose a stable, language-agnostic internal contract (submit,
  poll/await result, normalized verdict) so the rest of the system never depends on Judge0 specifics.
- Untrusted user code MUST be treated as hostile: submissions are validated and sandboxed via Judge0,
  with enforced time/memory limits, and Judge0 outputs are normalized and sanitized before crossing
  back into application logic.
- The evaluation layer MUST fail closed (a Judge0 outage yields a clear, retryable error — never a
  silent pass or a leak of internal detail) and MUST be independently testable with Judge0 mocked.

**Rationale**: Executing arbitrary user code is the platform's highest-risk surface. Concentrating
that risk behind one auditable boundary makes it securable, swappable, and testable in isolation.

### IV. Structured Data for the Bayesian Knowledge Model

The data model MUST be explicitly structured to inject, query, and update a Bayesian Network that
tracks each user's knowledge.
- The schema MUST represent knowledge concepts/skills as first-class entities, the network's
  structure (nodes and conditional dependencies), and per-user mastery state as distinct,
  versioned records — not derived ad hoc from submission logs.
- Evaluation outcomes MUST feed the Bayesian model through a defined update path (evidence in →
  posterior update → persisted mastery state); updates MUST be idempotent and traceable to the
  triggering submission.
- The network's parameters/structure MUST be versionable so the model can be re-trained or replaced
  without destructive migrations or loss of historical user state.
- Knowledge-model reads and writes MUST go through a dedicated data-access layer; UI and evaluation
  code MUST NOT issue raw model queries.

**Rationale**: User-knowledge tracking is the platform's core intelligence. A schema designed up
front for inference and incremental updates lets the Bayesian model evolve without rewriting the
data layer or corrupting learner history.

## Technology & Architecture Constraints

- **Frontend**: Next.js (App Router preferred) with TypeScript; strict layering per Principle I.
- **Cloud**: AWS as the deployment target; configuration via environment variables and managed
  secret stores; access governed by scoped IAM roles (Principle II).
- **Evaluation**: Judge0 as the execution engine, reached only through the isolated evaluation
  boundary (Principle III).
- **Data**: A structured store whose schema supports the Bayesian knowledge model — concepts,
  network structure, and versioned per-user mastery state (Principle IV).
- The four layers (frontend, deployment, evaluation, data/model) MUST remain independently
  deployable and testable; a change in one MUST NOT require lockstep changes in another.

## Development Workflow & Quality Gates

- Every plan and PR MUST include a Constitution Check confirming alignment with Principles I–IV;
  violations MUST be justified in the plan's Complexity/Tradeoffs section or the work is rejected.
- The evaluation boundary and the knowledge-model data-access layer MUST have automated tests with
  external systems (Judge0, AWS) mocked before merge.
- No secret may enter version control; CI MUST reject changes that introduce hardcoded credentials
  or client-exposed sensitive config.
- IAM and infrastructure changes MUST be reviewed explicitly and follow least-privilege.

## Governance

This constitution supersedes other development practices for this project. All plans, specs, tasks,
and PRs MUST verify compliance with Principles I–IV before approval.

- **Amendments** MUST be proposed as a change to this file, include rationale and any migration
  impact, and be approved before adoption.
- **Versioning** follows semantic versioning: MAJOR for backward-incompatible governance/principle
  removals or redefinitions, MINOR for a new principle/section or materially expanded guidance,
  PATCH for clarifications and non-semantic refinements.
- **Compliance** is reviewed at each plan and PR gate; unjustified complexity or principle
  violations block merge. Runtime development guidance lives in `CLAUDE.md` and the `.specify/`
  templates, which MUST stay consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-29 | **Last Amended**: 2026-05-29
