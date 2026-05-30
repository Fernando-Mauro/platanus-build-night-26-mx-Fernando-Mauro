// Just-in-time user sync (T011). On every successful Cognito auth, ensure a
// matching users row exists in RDS keyed by cognito_id. Runs server-side from
// Fargate (which has RDS access) — no post-confirmation Lambda needed.
import "server-only";
import { upsertUserByCognitoId, type SyncedUser } from "@/lib/db/users";
import { ensureColdStartMastery } from "@/lib/db/knowledge";

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
  // T019: a new learner starts at 50% on every competency. Best-effort — never
  // block sign-in if the Bayesian tables aren't seeded yet.
  try {
    await ensureColdStartMastery(user.id);
  } catch (err) {
    console.error("ensureColdStartMastery failed (non-fatal):", err);
  }
  return user;
}
