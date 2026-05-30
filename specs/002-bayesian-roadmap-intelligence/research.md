# Phase 0 Research: Bayesian Roadmap Intelligence + Cognito Auth

## R1. Frontend auth library — Auth.js (NextAuth) vs Amplify Auth (resolved)

**Decision**: **Auth.js (NextAuth v5) with the Cognito provider**, holding a server-side HTTP-only
cookie session. Cognito is the identity provider; Auth.js owns the app session.

**Rationale**: Hosting is ECS Fargate with Next.js App Router (SSR + server actions). Auth.js gives
cookie sessions that validate server-side, which is the natural fit and matches the data-access
layering chosen in feature 001 (one session source of truth, secrets server-only). Amplify Auth is
client-centric (its strengths are Amplify hosting/datastore, which we don't use), so it would add an
SDK whose value we don't capture.

**Alternatives considered**:
- *Amplify Auth client library* — viable (it wraps Cognito) and explicitly allowed by the user, but
  client-token-centric and redundant given Auth.js already covers Cognito; rejected to avoid an SDK
  we'd use only partially.
- *Raw Cognito Hosted UI redirect* — fastest to stand up, but we already have a designed Login/Registro
  UI (Vértice); using Auth.js Credentials/Cognito keeps our own screens.

**Sources**: [Using AWS Cognito as Auth for Next.js (BetaBud)](https://betabud.io/blog/aws-cognito-with-nextjs),
[Top authentication solutions for Next.js (WorkOS)](https://workos.com/blog/top-authentication-solutions-nextjs-2026),
[Set up Amplify Auth — Next.js](https://docs.amplify.aws/gen1/nextjs/prev/build-a-backend/auth/set-up-auth/).

## R2. DB sync strategy — app-side JIT upsert vs Cognito post-confirmation Lambda (resolved)

**Decision**: **Just-in-time (JIT) upsert in the Auth.js sign-in callback**: on every successful
auth, `lib/db` upserts a `users` row keyed by `cognito_id` (idempotent). This covers both first
registration and first login.

**Rationale**: RDS is private; the Fargate task already has network + IAM access to it and owns the
Prisma client. Doing the upsert server-side in the auth callback puts user-sync in one place
(`features/auth/jit-sync.ts` → `lib/db`), with no new infra. A post-confirmation Lambda would have to
be VPC-attached to reach private RDS (extra ENIs, cold starts, the same Prisma-engine packaging
problem we just solved for Fargate), and notably **does not fire for admin-created users**. JIT also
self-heals: if a row is ever missing, the next login recreates it.

**Update path**: `Cognito auth success → Auth.js jwt/signIn callback → upsert users(cognito_id, email,
display_name) → attach internal user id to the session`. Idempotent on the `cognito_id` unique key.

**Alternatives considered**:
- *Post-confirmation Lambda* — AWS's documented "bootstrap the user" hook; rejected for the VPC/cold-start
  cost above. Kept as a future option for non-interactive/admin signups.
- *Post-authentication Lambda* — same VPC cost; JIT in-app achieves the same on every login.

**Sources**: [Post confirmation Lambda trigger (AWS docs)](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html),
[Cognito Post Confirmation triggers (CloudThat)](https://www.cloudthat.com/resources/blog/using-post-confirmation-aws-lambda-triggers-in-amazon-cognito).

## R3. Cognito resources via CDK (resolved)

**Decision**: A new `infra/lib/auth-stack.ts` creates a **User Pool** (email sign-in, email
verification, strong password policy), a **User Pool App Client** (with a secret, used server-side by
Auth.js), and an **Identity Pool** federating the User Pool (per the explicit requirement). Pool id,
client id go out as CloudFormation outputs / `NEXT_PUBLIC_*`; the **client secret** goes to Secrets
Manager and is injected into the Fargate task definition.

**Rationale**: Keeps 100%-CLI IaC (Principle II); the App stack consumes the Cognito outputs as env.
The Identity Pool is created per the requirement (enables future direct AWS-resource access for signed-in
users), though the walking skeleton only needs the User Pool for login.

**Alternatives considered**: User Pool only (simpler) — but the requirement explicitly asks for an
Identity Pool too, so both are created.

## R4. Mastery update formula (resolved — engine core)

**Decision**: A **bounded linear update** on a 0–100 mastery scale (not a full BKT posterior), matching
the clarified demo parameters: on a real verdict, compute a base delta of **+15 (pass) / −15 (fail)**,
**split equally** across the problem's competencies (`delta / nLinkedCompetencies`), apply to each
linked competency's mastery, then **clamp to [0,100]**. Topic mastery = mean of its competencies.
Gating uses **±5 hysteresis** (lock <40, unlock >45). Cold start = **50** for all competencies. Every
update is **idempotent per submission** (guarded by the submission's applied-flag) and **traceable** to
the causing submission.

**Rationale**: The spec's clarified values (±15, equal split, 40/45 hysteresis, 50 prior) are
deliberately simple and demo-tunable; a linear bounded update reproduces them exactly, is trivially
unit-testable, and is cheap to run inside the submission API route. The parameters live in a tuning
record so they're configurable without code change (FR-006/012, SC-008).

**Alternatives considered**: Classic BKT posterior (pInit/pLearn/pSlip/pGuess) — more "correct"
probabilistically but harder to hit the exact requested demo deltas and to explain live; deferred as a
post-demo refinement. The data model keeps room for it (per-competency params already modeled in 001).

## R5. Reuse from feature 001 (resolved)

Builds directly on: the deployed Fargate/RDS/Judge0 skeleton, the `lib/db` data-access layer, the
`features/evaluation` Judge0 boundary (verdict source), and the two-layer (concept/competency→topic)
knowledge schema. This feature adds the `users.cognito_id` column, the auth layer, the seed, and the
update/gating/recommend engine; it does not re-architect the platform.
