// Knowledge data-access (T017/T019) — the ONLY Prisma caller for competencies,
// mastery, tuning and recommendations (Constitution Principle I/IV).
import "server-only";
import { prisma } from "./client";
import { normalizeTuning, type Tuning } from "@/features/knowledge/tuning";
import { deriveStatus, type Status } from "@/features/knowledge/gating";
import { selectRecommendation } from "@/features/knowledge/recommend";

const DIFF_RANK: Record<string, number> = { "Fácil": 0, "Media": 1, "Difícil": 2 };

/** Active tuning params from the model_versions row (falls back to defaults). */
export async function getActiveTuning(): Promise<Tuning> {
  const mv = await prisma.modelVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { params: true },
  });
  return normalizeTuning(mv?.params);
}

/**
 * Cold start (FR-015): ensure the learner has a ConceptMastery row at the
 * configured cold-start value for every competency. Idempotent — only creates
 * missing rows, never resets existing progress. Called from jit-sync (T019).
 */
export async function ensureColdStartMastery(userId: number): Promise<void> {
  const [comps, existing, tuning] = await Promise.all([
    prisma.competency.findMany({ select: { id: true } }),
    prisma.conceptMastery.findMany({ where: { userId }, select: { competencyId: true } }),
    getActiveTuning(),
  ]);
  const have = new Set(existing.map((e) => e.competencyId));
  const missing = comps.filter((c) => !have.has(c.id));
  if (missing.length === 0) return;
  await prisma.conceptMastery.createMany({
    data: missing.map((c) => ({
      userId,
      competencyId: c.id,
      pMastery: tuning.coldStart,
      status: "AVAILABLE",
    })),
    skipDuplicates: true,
  });
}

export type RoadmapCompetency = {
  id: number;
  slug: string;
  name: string;
  order: number;
  blurb: string | null;
  pMastery: number;
  status: Status;
  prerequisiteId: number | null;
  prerequisiteName: string | null;
  solvedProblemIds: number[];
  totalProblems: number;
  recommended: boolean;
};

export type Roadmap = {
  competencies: RoadmapCompetency[];
  recommendation:
    | { competencyId: number; competencyName: string; problemId: number | null; reason: string }
    | null;
};

/**
 * Full roadmap for a learner: every competency with derived mastery + status
 * (hysteresis applied and persisted) and the current recommendation. (T029/FR-015)
 */
export async function getRoadmap(userId: number): Promise<Roadmap> {
  await ensureColdStartMastery(userId);
  const tuning = await getActiveTuning();

  const comps = await prisma.competency.findMany({
    include: {
      topic: { select: { order: true, blurb: true } },
      problems: { select: { problemId: true } },
    },
  });
  const masteries = await prisma.conceptMastery.findMany({ where: { userId } });
  const mById = new Map(masteries.map((m) => [m.competencyId, m]));

  // Solved problems (PASSED submissions) for "n / total" progress.
  const passed = await prisma.submission.findMany({
    where: { userId, verdict: "PASSED" },
    select: { problemId: true },
    distinct: ["problemId"],
  });
  const solvedSet = new Set(passed.map((p) => p.problemId));

  // Sort by the topic order (the linear chain position).
  const ordered = [...comps].sort((a, b) => a.topic.order - b.topic.order);

  // 1st pass: derive structural status with hysteresis (needs prereq mastery).
  const masteryOf = (compId: number) => mById.get(compId)?.pMastery ?? tuning.coldStart;
  const statusUpdates: { competencyId: number; status: Status }[] = [];
  const rows: RoadmapCompetency[] = ordered.map((c) => {
    const m = mById.get(c.id);
    const own = m?.pMastery ?? tuning.coldStart;
    const prereqMastery = c.prerequisiteId !== null ? masteryOf(c.prerequisiteId) : null;
    const status = deriveStatus({
      ownMastery: own,
      prereqMastery,
      prevStatus: (m?.status as Status | undefined) ?? null,
      tuning,
    });
    if (m && m.status !== status) statusUpdates.push({ competencyId: c.id, status });
    const compProblemIds = c.problems.map((p) => p.problemId);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      order: c.topic.order,
      blurb: c.topic.blurb,
      pMastery: own,
      status,
      prerequisiteId: c.prerequisiteId,
      prerequisiteName: null,
      solvedProblemIds: compProblemIds.filter((id) => solvedSet.has(id)),
      totalProblems: compProblemIds.length,
      recommended: false,
    };
  });

  // Fill prerequisite names.
  const nameById = new Map(rows.map((r) => [r.id, r.name]));
  for (const r of rows) {
    r.prerequisiteName = r.prerequisiteId !== null ? nameById.get(r.prerequisiteId) ?? null : null;
  }

  // 2nd pass: recommendation + RECOMMENDED overlay.
  const reco = selectRecommendation(
    rows.map((r) => ({ id: r.id, order: r.order, pMastery: r.pMastery, status: r.status })),
    tuning
  );
  let recommendation: Roadmap["recommendation"] = null;
  if (reco) {
    const target = rows.find((r) => r.id === reco.competencyId)!;
    if (target.status !== "LOCKED" && target.status !== "MASTERED") {
      target.status = "RECOMMENDED";
      target.recommended = true;
      const u = statusUpdates.find((s) => s.competencyId === target.id);
      if (u) u.status = "RECOMMENDED";
      else if (mById.get(target.id)?.status !== "RECOMMENDED")
        statusUpdates.push({ competencyId: target.id, status: "RECOMMENDED" });
    }
    // Pick the easiest problem from the recommended competency.
    const src = comps.find((c) => c.id === reco.competencyId);
    const problemId = await pickEasiestProblemId(reco.competencyId);
    recommendation = {
      competencyId: reco.competencyId,
      competencyName: src?.name ?? target.name,
      problemId,
      reason: reco.reason,
    };
  }

  // Persist any status changes (hysteresis is stateful).
  await Promise.all(
    statusUpdates.map((s) =>
      prisma.conceptMastery.updateMany({
        where: { userId, competencyId: s.competencyId },
        data: { status: s.status },
      })
    )
  );

  return { competencies: rows, recommendation };
}

/** Easiest (then lowest-id) problem linked to a competency. */
export async function pickEasiestProblemId(competencyId: number): Promise<number | null> {
  const links = await prisma.problemCompetency.findMany({
    where: { competencyId },
    include: { problem: { select: { id: true, difficulty: true } } },
  });
  if (links.length === 0) return null;
  links.sort((a, b) => {
    const d = (DIFF_RANK[a.problem.difficulty] ?? 1) - (DIFF_RANK[b.problem.difficulty] ?? 1);
    return d !== 0 ? d : a.problem.id - b.problem.id;
  });
  return links[0].problem.id;
}

/** A problem plus the competencies it exercises and the learner's current mastery. */
export async function getProblemForSubmission(problemId: number, userId: number) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { competencies: { include: { competency: true } } },
  });
  if (!problem) return null;
  const competencyIds = problem.competencies.map((pc) => pc.competencyId);
  const masteries = await prisma.conceptMastery.findMany({
    where: { userId, competencyId: { in: competencyIds } },
  });
  const mById = new Map(masteries.map((m) => [m.competencyId, m]));
  return {
    problem,
    competencies: problem.competencies.map((pc) => ({
      id: pc.competencyId,
      name: pc.competency.name,
      pMastery: mById.get(pc.competencyId)?.pMastery ?? 50,
    })),
  };
}
