// GET /api/activity — authenticated recent submissions for the home feed.
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/features/auth/session";
import { getRecentSubmissions } from "@/lib/db/problems";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const activity = await getRecentSubmissions(userId);
    return NextResponse.json({ activity }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/activity failed:", err);
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}
