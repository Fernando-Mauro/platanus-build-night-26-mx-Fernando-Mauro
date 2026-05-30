// POST /api/submissions (T025) — authenticated. Persists the submission, runs
// the Judge0 evaluation (ECS → private EC2), then applies the Bayesian mastery
// update exactly once, and returns the verdict + mastery delta + gating so the
// roadmap can react. (contracts/mastery-api.md)
import { NextResponse } from "next/server";
import { auth } from "@/features/auth/auth.config";
import { evaluate, type TestCase } from "@/features/evaluation/evaluate";
import { computeMasteryUpdate, isRealVerdict, type Verdict } from "@/features/knowledge/update";
import { getActiveTuning, getProblemForSubmission, getRoadmap } from "@/lib/db/knowledge";
import { applyMasteryDeltas, createSubmission } from "@/lib/db/submissions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Map the UI's language slug to a Judge0 language id (problem default wins).
const LANG_IDS: Record<string, number> = { cpp: 54, python: 71, javascript: 63 };

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { internalId?: number } | undefined)?.internalId;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { problemId?: number; sourceCode?: string; lang?: string; languageId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { problemId, sourceCode } = body;
  if (typeof problemId !== "number" || typeof sourceCode !== "string" || !sourceCode.trim()) {
    return NextResponse.json({ error: "problemId and sourceCode are required" }, { status: 400 });
  }

  const data = await getProblemForSubmission(problemId, userId);
  if (!data) return NextResponse.json({ error: "problem_not_found" }, { status: 404 });

  const languageId =
    body.languageId ?? (body.lang ? LANG_IDS[body.lang] : undefined) ?? data.problem.languageId;
  const testCases = (data.problem.testCases as unknown as TestCase[]) ?? [];

  // 1. Run on Judge0 (fails closed → ERROR, which moves no mastery).
  const result = await evaluate({ sourceCode, languageId, testCases });

  // 2. Persist the submission.
  const submission = await createSubmission({
    userId,
    problemId,
    languageId,
    sourceCode,
    verdict: result.verdict,
    passedCount: result.passedCount,
    totalCount: result.totalCount,
    runtimeMs: result.runtimeMs,
  });

  // 3. Apply the mastery update once (only on a real pass/fail verdict).
  let masteryDelta: { competency: string; before: number; after: number }[] = [];
  if (isRealVerdict(result.verdict as Verdict)) {
    const tuning = await getActiveTuning();
    const deltas = computeMasteryUpdate({
      verdict: result.verdict as Verdict,
      competencies: data.competencies,
      tuning,
    });
    const applied = await applyMasteryDeltas({ submissionId: submission.id, userId, deltas });
    if (applied) {
      masteryDelta = deltas.map((d) => ({
        competency: d.name ?? `#${d.competencyId}`,
        before: d.before,
        after: d.after,
      }));
    }
  }

  // 4. Derive fresh gating from the recomputed roadmap.
  let gating: { lockedTopic: string | null; recommendedProblemId: number | null; reason: string | null } = {
    lockedTopic: null,
    recommendedProblemId: null,
    reason: null,
  };
  try {
    const roadmap = await getRoadmap(userId);
    const locked = roadmap.competencies.find((c) => c.status === "LOCKED");
    gating = {
      lockedTopic: locked?.name ?? null,
      recommendedProblemId: roadmap.recommendation?.problemId ?? null,
      reason: roadmap.recommendation?.reason ?? null,
    };
  } catch (err) {
    console.error("gating recompute failed (non-fatal):", err);
  }

  return NextResponse.json(
    {
      submissionId: submission.id,
      verdict: result.verdict,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      runtimeMs: result.runtimeMs,
      masteryDelta,
      gating,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
