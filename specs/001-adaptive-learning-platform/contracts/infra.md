# Infrastructure Contract — AWS CDK (TypeScript), 100% CLI-provisioned (Principle II)

Provisioned via `cdk deploy`, assuming `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` already in the
local environment (operator deploy credentials only — input #4). No console clicks.

## Stacks

### NetworkStack — `infra/lib/network-stack.ts`
- **VPC** with 2 AZs: public subnets (NAT egress) + private-with-egress subnets.
- **NAT Gateway** so private subnets (Judge0) can pull Docker images / Judge0 release at boot.
- **Security Groups**:
  - `albSg` — internet-facing ALB; ingress `443`/`80` from `0.0.0.0/0` (the only public edge).
  - `fargateSg` — attached to the ECS Fargate tasks; ingress on the app port from `albSg` only.
  - `rdsSg` — ingress `5432` **only** from `fargateSg`.
  - `judge0Sg` — ingress `2358` **only** from `fargateSg`; egress to NAT for image pulls.
  - No `0.0.0.0/0` ingress on RDS or Judge0 (Principle II/III — no wildcards).

### DataStack — `infra/lib/data-stack.ts`
- **RDS PostgreSQL** in private subnets, `rdsSg`, encrypted, not publicly accessible.
- Credentials auto-generated into **Secrets Manager** (`appDbSecret`); rotation-capable.
- Outputs the secret ARN + endpoint for the AppStack.

### Judge0Stack — `infra/lib/judge0-stack.ts`
- **EC2 t3.medium**, Ubuntu 22.04 LTS, in a private subnet, `judge0Sg`.
- **Instance role**: `ssm:*` for Session Manager access + read of its own `judge0Secret` only
  (no wildcards, no inbound SSH — access via SSM).
- **User data** = `infra/scripts/judge0-userdata.sh` (see research R2): install Docker + Compose,
  set cgroup v1 GRUB params, **reboot**, then download official Judge0, inject `AUTHN_TOKEN`
  + DB/Redis passwords from Secrets Manager, `docker compose up -d`.
- `judge0Secret` (Secrets Manager) holds the `AUTHN_TOKEN`.

### AppStack — `infra/lib/app-stack.ts`
- **ECR repo** for the Next.js container image.
- **ECS cluster + Fargate service** running the Next.js image, tasks placed in the **private
  subnets** with `fargateSg`, fronted by an **Application Load Balancer** (`albSg`) in the public
  subnets. Tasks reach RDS + Judge0 privately because they live inside the VPC.
- **Task role** (least privilege): read `appDbSecret` + `judge0Secret`; nothing else. **Execution
  role**: pull the image from ECR + write logs to CloudWatch only.
- Runtime env (from Secrets Manager via the task definition, not the bundle): `DATABASE_URL`,
  `JUDGE0_URL` (`http://<judge0-private-ip>:2358`), `JUDGE0_AUTHN_TOKEN`, `AUTH_SECRET`. Only
  `NEXT_PUBLIC_*` (non-sensitive) is exposed client-side.
- The ALB is the only internet-facing endpoint; Fargate tasks have no public IP.

## Deploy flow (quickstart cross-ref)
1. `cdk bootstrap` (first time).
2. `cdk deploy NetworkStack DataStack Judge0Stack` → VPC, RDS, Judge0.
3. Build + push Next.js image to ECR.
4. `cdk deploy AppStack` → ECS Fargate service online behind the ALB, wired to RDS + Judge0.
5. Run Prisma migrations + seed content against RDS (via the Fargate task image or a one-off task).

## Security posture (Principle II/III checklist)
- [ ] No secret in repo or image; all via Secrets Manager at runtime.
- [ ] No `*` IAM actions/resources; each role scoped to its named secrets/services.
- [ ] RDS + Judge0 have **no** public ingress; reachable only from the Fargate task SG (`fargateSg`).
- [ ] Judge0 never internet-exposed (sandbox-escape risk — research R2).
- [ ] Only `NEXT_PUBLIC_*` reaches the browser.
