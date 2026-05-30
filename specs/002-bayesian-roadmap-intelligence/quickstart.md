# Quickstart: Bayesian Roadmap Intelligence + Cognito Auth

## New env (local `.env.local` / AWS Secrets Manager)
```
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/<userPoolId>
COGNITO_CLIENT_ID=<app client id>
COGNITO_CLIENT_SECRET=<from Secrets Manager>      # server-only
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<userPoolId>     # non-sensitive
NEXT_PUBLIC_COGNITO_CLIENT_ID=<app client id>     # non-sensitive
AUTH_SECRET=<random 32-byte base64>
```

## Deploy (extends the 001 infra)
```bash
cd infra
pnpm install
cdk deploy Vertice-Auth          # NEW: Cognito User Pool + Identity Pool + client secret
cdk deploy Vertice-App           # redeploy Fargate task with Cognito env wired
pnpm prisma migrate deploy       # adds users.cognito_id + Bayesian tables
pnpm db:seed                     # 5-competency chain, 10 problems, 50% priors, tuning params
```

## Demo script (maps to spec)
1. **Register** a new learner via the Login/Registro screen → Cognito creates the account; first login
   JIT-upserts a `users` row (with `cognito_id`) + 50% mastery for all 5 competencies (FR-015, SC-007).
2. Open the roadmap → all competencies at 50%, Arreglos available.
3. **Fail** a Recursión problem once → mastery 50→35 (below 40%) → the dependent advanced topic
   (Árboles) locks and a prerequisite reinforcement problem is recommended (US3, SC-003).
4. **Pass** the recommended reinforcement until mastery climbs **above 45%** → Árboles re-unlocks
   (FR-011, SC-004) — note it does *not* re-unlock at exactly 40% (±5 hysteresis).
5. Confirm two consecutive fails drop a competency 50→35→20 (~30 pts, SC-002).

## Verify security (Principle II)
- `COGNITO_CLIENT_SECRET` / `AUTH_SECRET` only in Secrets Manager, never in repo/bundle.
- Browser network tab: only `NEXT_PUBLIC_*` Cognito ids present client-side.
