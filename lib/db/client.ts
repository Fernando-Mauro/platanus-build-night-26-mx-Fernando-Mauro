// Single Prisma client singleton (T004). This is the ONLY module that
// instantiates PrismaClient (Constitution Principle I/IV: one data-access layer).
// Guards against multiple instances during Next.js hot-reload in dev.
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
