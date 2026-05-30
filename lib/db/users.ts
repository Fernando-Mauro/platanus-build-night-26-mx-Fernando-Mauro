// User data-access. The only place that reads/writes the users table
// (Constitution Principle I/IV — single data-access layer). Local auth: email +
// scrypt password hash (off-AWS; no more Cognito).
import "server-only";
import { prisma } from "./client";
import { hashPassword, verifyPassword } from "@/features/auth/password";

export type SyncedUser = { id: number; email: string };

/** Create a learner with a hashed password. Throws if the email already exists. */
export async function registerUser(input: {
  email: string;
  password: string;
  displayName?: string | null;
}): Promise<SyncedUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("Ese correo ya está registrado.");
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: hashPassword(input.password),
      displayName: input.displayName ?? null,
    },
    select: { id: true, email: true },
  });
  return user;
}

/** Validate email + password. Returns the user on success, null otherwise. */
export async function authenticateUser(
  email: string,
  password: string
): Promise<SyncedUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email };
}

/** Resolve the internal user id from an email. */
export async function getUserIdByEmail(email: string): Promise<number | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}
