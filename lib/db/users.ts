// User data-access (feature 002). The only place that reads/writes the users
// table (Constitution Principle I/IV — single data-access layer).
import "server-only";
import { prisma } from "./client";

export type SyncedUser = { id: number; cognitoId: string; email: string };

/**
 * Idempotent upsert keyed on cognito_id. Covers both first registration and first
 * login; repeated calls don't duplicate or reset state. (FR-001 / contracts/auth.md)
 */
export async function upsertUserByCognitoId(input: {
  cognitoId: string;
  email: string;
  displayName?: string | null;
}): Promise<SyncedUser> {
  const user = await prisma.user.upsert({
    where: { cognitoId: input.cognitoId },
    create: {
      cognitoId: input.cognitoId,
      email: input.email,
      displayName: input.displayName ?? null,
    },
    update: { email: input.email }, // keep email fresh; never clobber app state
    select: { id: true, cognitoId: true, email: true },
  });
  return user;
}
