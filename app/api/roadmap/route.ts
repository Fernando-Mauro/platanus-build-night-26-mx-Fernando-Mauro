// GET /api/roadmap (T029) — authenticated. Returns the learner's full roadmap:
// every competency with derived mastery + status (hysteresis applied) and the
// current recommendation. (contracts/mastery-api.md, FR-015)
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth.config";
import { getRoadmap } from "@/lib/db/knowledge";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { internalId?: number } | undefined)?.internalId;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  try {
    const roadmap = await getRoadmap(userId);
    return NextResponse.json(roadmap, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/roadmap failed:", err);
    return NextResponse.json({ error: "roadmap_unavailable" }, { status: 500 });
  }
}
