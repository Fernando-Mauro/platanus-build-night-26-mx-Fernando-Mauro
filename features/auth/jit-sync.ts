// Just-in-time user sync (T011). On every successful Cognito auth, ensure a
// matching users row exists in RDS keyed by cognito_id. Runs server-side from
// Fargate (which has RDS access) — no post-confirmation Lambda needed.
// Cold-start mastery (50% per competency) is created here in Phase 4 (T019);
// for the Phase-3 auth slice we only ensure the user row.
import "server-only";
import { upsertUserByCognitoId, type SyncedUser } from "@/lib/db/users";

export async function jitSync(input: {
  cognitoId: string;
  email: string;
  name?: string | null;
}): Promise<SyncedUser> {
  const user = await upsertUserByCognitoId({
    cognitoId: input.cognitoId,
    email: input.email,
    displayName: input.name,
  });
  // Phase 4 (T019): await ensureColdStartMastery(user.id) once the Bayesian
  // tables exist, so a new learner starts at 50% on every competency.
  return user;
}
