# Cognito Infra Contract — CDK `infra/lib/auth-stack.ts`

## Resources
- **User Pool** (`Vertice-Users`):
  - Sign-in alias: email. Self sign-up enabled. Email verification (code).
  - Password policy: min 8, upper+lower+digit. Account recovery: email.
  - `removalPolicy: DESTROY` for the hackathon (revisit for prod).
- **User Pool App Client** (`Vertice-WebClient`):
  - `generateSecret: true` (server-side Auth.js confidential client).
  - Auth flows: authorization code (OIDC). Callback/logout URLs: the ALB URL `/api/auth/callback/cognito`.
- **Identity Pool** (`Vertice-Identities`):
  - Federates the User Pool (`cognitoIdentityProviders` = the pool + app client).
  - Authenticated IAM role (least privilege; minimal/no extra AWS access for the demo).
- **Client secret** → Secrets Manager (`cognitoClientSecret`).

## Outputs (consumed by AppStack)
- `UserPoolId`, `UserPoolClientId`, `IdentityPoolId`, `CognitoIssuerUrl`.
- AppStack injects into the Fargate task:
  - env (non-sensitive): `COGNITO_ISSUER`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`.
  - secret (Secrets Manager): `COGNITO_CLIENT_SECRET`.

## Wiring / sequence
1. `cdk deploy Vertice-Auth` (new stack) → Cognito + secret.
2. AppStack reads the Auth stack outputs + secret and redeploys the Fargate task with the new env.
3. App's `/api/auth/*` now authenticates against the pool; first login JIT-upserts into RDS.

## Security (Principle II)
- Client secret only in Secrets Manager → task definition; never in repo/bundle.
- Identity Pool authenticated role scoped to least privilege (no wildcards).
- Cognito managed via CDK (IaC, reviewable).
