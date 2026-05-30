# Auth Contract — Auth.js (NextAuth) + Cognito + JIT user sync

## Routes / handler
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (GET/POST).
- Provider: **Cognito** (`issuer`, `clientId`, `clientSecret`, scopes `openid email profile`).
- Session strategy: JWT in an HTTP-only, secure cookie (validated server-side).

## Config (`features/auth/auth.config.ts`)
- `providers: [Cognito({ clientId, clientSecret, issuer })]` — values from env:
  `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET` (Secrets Manager), `COGNITO_ISSUER`
  (`https://cognito-idp.us-east-1.amazonaws.com/<userPoolId>`).
- `AUTH_SECRET` from Secrets Manager.

## Callbacks
- **`signIn` / `jwt`**: on a successful auth, call `jitSync({ cognitoId: token.sub, email, name })`
  (see below) and attach the returned internal `userId` to the token.
- **`session`**: expose `session.user.id` (internal `users.id`) and `session.user.cognitoId` to server
  code; never expose secrets.

## JIT sync (`features/auth/jit-sync.ts` → `lib/db`)
```ts
// Idempotent upsert keyed on cognito_id. Runs server-side from Fargate (has RDS access).
async function jitSync(input: { cognitoId: string; email: string; name?: string }): Promise<{ userId: number }> {
  const user = await db.users.upsert({
    where: { cognitoId: input.cognitoId },
    create: { cognitoId: input.cognitoId, email: input.email, displayName: input.name },
    update: { email: input.email },          // keep email fresh; do not clobber app state
  });
  await db.ensureColdStartMastery(user.id);  // create 50% ConceptMastery rows if missing
  return { userId: user.id };
}
```
- Idempotent: repeated logins do not duplicate rows or reset mastery.
- Self-healing: a missing user/mastery row is (re)created on next login.

## Behavior / guards
- Unauthenticated requests to learner routes (`/roadmap`, `/problems/*`, `POST /api/submissions`) →
  redirected to `/login` (server-side guard via `features/auth/session.ts`).
- Client receives only non-sensitive `NEXT_PUBLIC_*` Cognito ids; client secret never reaches the bundle.
