// Server-side session helpers + route guards.
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth.config";
import { getUserIdByEmail } from "@/lib/db/users";

/** Returns the current session or null (server components / route handlers). */
export async function getSession() {
  return auth();
}

/**
 * Internal user id for the current request. Prefers the value on the session,
 * falling back to a DB lookup by email so older JWTs still resolve. Null = not
 * signed in.
 */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  const u = session?.user as { internalId?: number; email?: string | null } | undefined;
  if (typeof u?.internalId === "number") return u.internalId;
  if (u?.email) return getUserIdByEmail(u.email);
  return null;
}

/** Guard: require an authenticated learner, else redirect to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
