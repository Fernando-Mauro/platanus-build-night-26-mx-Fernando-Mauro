// Walking-skeleton connectivity endpoint (T006).
// Proves the Next.js backend can reach the local PostgreSQL and Judge0.
// Fails closed and never leaks secrets or internal detail.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { pingJudge0 } from "@/features/evaluation/judge0-client";

// Always run at request time (touches DB + network), never at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  // DB round-trip (raw SELECT 1 — no schema dependency).
  let db: "ok" | "error" = "ok";
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    db = "error";
    dbError = err instanceof Error ? err.message : "db unreachable";
  }

  // Judge0 health.
  const judge0 = await pingJudge0();

  const healthy = db === "ok" && judge0.ok;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      db,
      dbError,
      judge0: judge0.ok ? "ok" : "error",
      judge0Version: judge0.version,
      judge0Error: judge0.error,
    },
    { status: healthy ? 200 : 503 }
  );
}
