// Server-side session helpers + route guards (T012/T013).
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./auth.config";

/** Returns the current session or null (server components / route handlers). */
export async function getSession() {
  return auth();
}

/** Guard: require an authenticated learner, else redirect to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
