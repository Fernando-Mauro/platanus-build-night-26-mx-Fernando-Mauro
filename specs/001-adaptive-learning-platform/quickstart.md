# Quickstart: Adaptive Learning Platform

## Prerequisites
- Node.js 20 LTS, pnpm (or npm)
- Docker (for local Judge0 + local Postgres)
- AWS CLI + CDK v2, with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` exported (deploy only)

## Local development
```bash
pnpm install
# Local Postgres + local Judge0 via docker compose (dev only)
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env.local        # DATABASE_URL, JUDGE0_URL, JUDGE0_AUTHN_TOKEN, AUTH_SECRET
pnpm prisma migrate dev           # apply schema (prisma/schema.prisma)
pnpm db:seed                      # seed topics, concepts, prereq edges, problems, test cases
pnpm dev                          # Next.js on http://localhost:3000
```

## Tests
```bash
pnpm test:unit     # Vitest — Bayesian engine + evaluation boundary (Judge0 mocked)
pnpm test:e2e      # Playwright — submit→verdict, roadmap adaptation
```

## Deploy to AWS (100% CLI — see contracts/infra.md)
```bash
# 1. Provision network, RDS, Judge0
cd infra
pnpm install
cdk bootstrap                                   # first time only
cdk deploy NetworkStack DataStack Judge0Stack

# 2. Build & push the Next.js image
docker build -t adaptive-learning .
# (tag + push to the ECR repo created by AppStack's first synth, then:)

# 3. Deploy the web app (ECS Fargate service + ALB)
cdk deploy AppStack

# 4. Migrate + seed RDS (one-off, via the Fargate task image or local with tunneled creds)
pnpm prisma migrate deploy
pnpm db:seed
```

## Smoke test (maps to spec success criteria)
1. Register → land on roadmap with baseline mastery + a starting recommendation (SC-006).
2. Open a problem, submit a correct solution → `PASSED` verdict in < 10 s (SC-001, SC-002).
3. Submit a slow/looping solution → `LIMIT_EXCEEDED` within 30 s, never hangs (FR-005a).
4. Repeatedly fail a Graphs problem → roadmap surfaces a DFS/Trees prerequisite recommendation
   on next refresh (Story 3, SC-003).
5. Disconnect mid-submission → verdict + mastery update still appear in history on return (FR-007).

## Verifying the security posture (Principle II/III)
- `aws ec2 describe-security-groups` → RDS/Judge0 have no `0.0.0.0/0` ingress.
- ECS Fargate task role + EC2 instance role contain no `"*"` actions/resources.
- No secrets in the repo or container image; all read from Secrets Manager at runtime.
