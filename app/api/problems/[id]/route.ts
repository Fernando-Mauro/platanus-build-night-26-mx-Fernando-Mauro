// GET /api/problems/[id] (T017) — authenticated problem detail for the workspace.
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth.config";
import { getProblemDetail } from "@/lib/db/problems";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const problemId = Number(id);
  if (!Number.isInteger(problemId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  try {
    const problem = await getProblemDetail(problemId);
    if (!problem) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ problem }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/problems/[id] failed:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
