# Phase 0 Research: Adaptive Learning Platform

All NEEDS CLARIFICATION items from Technical Context are resolved below.

## R1. Compute platform for the unified Next.js app (BLOCKER — resolved)

**Decision**: Deploy the Next.js app as a container on **Amazon ECS Fargate behind an Application
Load Balancer**, with tasks in private VPC subnets — not AWS Amplify Hosting. (Finalized by the user;
App Runner + VPC Connector was the earlier candidate but is discarded.)

**Rationale**: The spec requires strict isolation of the evaluation tier (Principle III) and a
private data tier reachable only from the backend (input #3). AWS Amplify Hosting SSR compute
**cannot be attached to a VPC** and exposes no static egress IPs, so it cannot reach a private RDS
or private Judge0 by security-group allow-list. The Feb 2025 "IAM roles for SSR" Amplify feature
added role-based credentials but **not** VPC connectivity. ECS Fargate runs the container task
directly inside the VPC's private subnets, so it reaches private RDS + Judge0 over their security
groups while the data/eval tiers stay fully private and SG-restricted. An internet-facing ALB is the
only public edge; tasks have no public IP. Fargate is fully CLI/CDK-provisionable and gives explicit
control over networking, the ALB, and task sizing.

**Alternatives considered**:
- *Amplify Hosting (original input)* — rejected: no VPC attachment ⇒ RDS/Judge0 would have to be
  internet-exposed with relaxed SGs, violating Principle III.
- *AWS App Runner + VPC Connector* — viable (VPC egress via a connector, less wiring than Fargate),
  was the initial recommendation; discarded by the user in favor of Fargate's fuller control (ALB,
  VPC-native task placement, task sizing).
- *Lambda (Next.js adapter) in VPC* — possible but the 30 s synchronous submission budget and SSR
  cold-starts make a long-running container cleaner.

**Sources**: [VPC Access for SSR Compute Runtime · aws-amplify/amplify-hosting#3362](https://github.com/aws-amplify/amplify-hosting/issues/3362),
[next.js on Amplify: how to connect to an RDS database? · AWS re:Post](https://repost.aws/questions/QUaqTDfgxWSEOLwbzsWhfnNg/next-js-on-amplify-how-to-connect-to-an-rds-database),
[Amplify Hosting announces IAM roles for SSR applications (AWS, Feb 2025)](https://aws.amazon.com/about-aws/whats-new/2025/02/amplify-hosting-iam-roles-ssr-applications/).

## R2. Judge0 on EC2 — host configuration (resolved)

**Decision**: Run Judge0 via its official `docker-compose` on an EC2 **t3.medium** with **Ubuntu
22.04 LTS**, configured for **cgroup v1** in the user-data script, with the Judge0 container in
`--privileged` mode (as the official image requires).

**Rationale**: Judge0's `isolate` sandbox needs functional **cgroup v1** memory limiting. Modern
distros default to cgroup v2, which breaks Judge0 with errors like `rb_sysopen` / status 13. The
fix is to set kernel boot parameters `systemd.unified_cgroup_hierarchy=0
systemd.legacy_systemd_cgroup_controller=1` in GRUB and **reboot** before starting the stack.
Ubuntu 22.04 LTS supports the required cgroup v1 controllers. The container must run privileged to
access host components for sandboxing untrusted code.

**User-data sequence** (see `infra/scripts/judge0-userdata.sh`):
1. Install Docker Engine + the Compose plugin.
2. Append cgroup v1 params to `GRUB_CMDLINE_LINUX_DEFAULT`, `update-grub`.
3. Use a cloud-init `bootcmd`/oneshot pattern so that **after the reboot** the script downloads the
   official Judge0 release (`docker-compose.yml` + `judge0.conf`), sets a strong `AUTHN_TOKEN` and
   DB/Redis passwords in `judge0.conf` (pulled from instance metadata / Secrets Manager), and runs
   `docker compose up -d`.
4. Judge0 listens on `:2358`, bound so only the instance SG governs access.

**Alternatives considered**:
- *Amazon Linux 2023* — rejected: cgroup v2 only; more friction to get cgroup v1 working.
- *Managed sandbox / Lambda-per-submission* — out of scope; the spec/input mandate self-hosted
  Judge0 on EC2.

**Sources**: [Self-Hosting Judge0 on EC2 (Tutorials Dojo)](https://tutorialsdojo.com/self-hosting-judge0-a-step-by-step-guide-using-aws-ec2-lambda-and-s3/),
[judge0/judge0 Docker image](https://hub.docker.com/r/judge0/judge0),
[Judge0 docker-compose (GitHub)](https://github.com/judge0/judge0/blob/master/docker-compose.dev.yml),
[Judge0 Sandbox Escape (tantosec)](https://tantosec.com/blog/judge0/) (reinforces: keep Judge0
network-isolated; never expose it publicly).

## R3. Synchronous evaluation with a 30 s budget (resolved)

**Decision**: The `POST /api/submissions` route calls the evaluation boundary, which submits to
Judge0 and **waits** for the result using Judge0's blocking parameter (`wait=true`) where viable, or
short server-side polling of `GET /submissions/{token}` with an overall **30 s** wall-clock deadline
(FR-005a). On deadline, return a `TIMEOUT`/`ERROR` verdict (fail closed). The evaluation completes
server-side and the verdict + mastery update are persisted idempotently even if the client
disconnects (FR-007, abandoned-submission edge case).

**Rationale**: Matches the clarified synchronous model (Clarifications session 2026-05-29). Judge0's
`wait=true` simplifies the happy path; server-side polling with a hard deadline bounds the worst
case and keeps the boundary fail-closed. Idempotency is keyed on the application submission id.

**Alternatives considered**: Async callbacks / client polling — rejected per the spec clarification
(synchronous wait chosen).

## R4. Bayesian knowledge model — engine and storage (resolved)

**Decision**: Implement a **custom Bayesian Knowledge Tracing (BKT)** update at the **concept** node
level plus a **directional propagation** pass along prerequisite edges, in TypeScript under
`features/knowledge`. Persist BKT parameters per concept (`pLearn`, `pSlip`, `pGuess`,
`pTransit`/init prior) and versioned per-learner concept mastery in PostgreSQL.

**Rationale**: The spec's clarified model is a two-layer network (concepts → topics) with
**directional** propagation along prerequisite edges (not full bidirectional inference). BKT is the
standard, well-understood per-skill update from binary-plus evidence (correctness, and we extend
with time/attempts as modifiers), and is cheap enough to run inside an API Route. A custom
implementation gives full control over the propagation rule and avoids pulling a heavy/under-
maintained general Bayes-net dependency. Topic mastery is a deterministic aggregate of its concepts.

**Update path (idempotent, traceable)**: `submission verdict → evidence → BKT update on the
submission's concept(s) → directional decay/boost on linked prerequisite/dependent concepts →
recompute affected topic aggregates → persist new mastery version (keyed to submission id)`.

**Hysteresis (FR-016)**: mastery *status* (recommended / mastered) uses two thresholds with a margin
band so the label does not flip on a single near-threshold submission.

**Alternatives considered**:
- *General Bayesian-network library (e.g. `bayesjs`)* — rejected for the MVP: heavier, less control
  over the custom propagation semantics, and exact inference over a growing graph is overkill given
  we deliberately chose directional (not full) propagation.
- *Topic-only single-layer model* — rejected at clarification (two-layer chosen).

## R5. Auth, ORM, and editor (resolved)

**Decision**: **Auth.js (NextAuth)** with the Credentials provider and database sessions in Postgres
(email/password per spec assumption); **Prisma** as ORM + migration tool against RDS PostgreSQL;
**Monaco Editor** (`@monaco-editor/react`) for the integrated code editor.

**Rationale**: All three are mature, well-documented, and fit the unified Next.js App Router model.
Prisma gives typed access and versioned migrations (supports the "versionable model" requirement).
Monaco is the de-facto in-browser code editor (same engine as VS Code) with multi-language support.

**Alternatives considered**: Drizzle (lighter, but Prisma's migration tooling is friendlier for the
schema-evolution requirement); CodeMirror (lighter than Monaco but less batteries-included).

## R6. Secrets & IAM (resolved — Principle II)

**Decision**: DB credentials are generated by RDS/CDK into **AWS Secrets Manager**; the Judge0
`AUTHN_TOKEN` is a Secrets Manager secret. The ECS Fargate task reads them as runtime env vars via its
task role; the EC2 instance role grants only `ssm:` (Session Manager) + read of its own Judge0 secret. No
wildcard IAM. The local `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are operator deploy credentials
only. Client receives only `NEXT_PUBLIC_*` non-sensitive config.

**Rationale**: Directly satisfies Principle II (externalized secrets, least-privilege, nothing in
the bundle/repo).

**Alternatives considered**: SSM Parameter Store SecureString (equivalent; Secrets Manager chosen
for native RDS credential rotation integration).
