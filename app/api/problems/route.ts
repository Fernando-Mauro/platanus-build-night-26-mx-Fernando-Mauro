// GET /api/problems (T017) — authenticated list of seeded problems + competencies.
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth.config";
import { listProblems } from "@/lib/db/problems";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const problems = await listProblems();
    return NextResponse.json({ problems }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/problems failed:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
