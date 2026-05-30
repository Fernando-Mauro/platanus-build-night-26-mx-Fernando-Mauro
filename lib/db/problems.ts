// Problem data-access (T017 cont.) — read side for the problems list + detail
// the workspace/roadmap consume. Only Prisma caller for problems (Principle I/IV).
import "server-only";
import { prisma } from "./client";

export type ProblemListItem = {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  competencies: { id: number; name: string; slug: string }[];
  attempts: number;
  solved: boolean;
};

/**
 * All seeded problems with their competencies + this learner's status
 * (solved / attempted), ordered by the chain then id.
 */
export async function listProblems(userId?: number): Promise<ProblemListItem[]> {
  const problems = await prisma.problem.findMany({
    include: { competencies: { include: { competency: { include: { topic: true } } } } },
    orderBy: { id: "asc" },
  });

  // Per-learner submission stats (solved = any PASSED; attempts = total).
  const stats = new Map<number, { attempts: number; solved: boolean }>();
  if (userId) {
    const subs = await prisma.submission.findMany({
      where: { userId },
      select: { problemId: true, verdict: true },
    });
    for (const s of subs) {
      const cur = stats.get(s.problemId) ?? { attempts: 0, solved: false };
      cur.attempts += 1;
      if (s.verdict === "PASSED") cur.solved = true;
      stats.set(s.problemId, cur);
    }
  }

  return problems
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      competencies: p.competencies.map((pc) => ({
        id: pc.competency.id,
        name: pc.competency.name,
        slug: pc.competency.slug,
      })),
      order: Math.min(...p.competencies.map((pc) => pc.competency.topic.order), 99),
      attempts: stats.get(p.id)?.attempts ?? 0,
      solved: stats.get(p.id)?.solved ?? false,
    }))
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map(({ order: _order, ...rest }) => rest);
}

/** Full problem detail for the workspace (statement, starter code, visible tests). */
export async function getProblemDetail(id: number) {
  const p = await prisma.problem.findUnique({
    where: { id },
    include: { competencies: { include: { competency: true } } },
  });
  if (!p) return null;
  const tests = (p.testCases as unknown as { input: string; expectedOutput: string; hidden?: boolean }[]) ?? [];
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    statement: p.statement,
    starterCode: p.starterCode,
    languageId: p.languageId,
    competencies: p.competencies.map((pc) => ({
      id: pc.competency.id,
      name: pc.competency.name,
    })),
    // Only expose visible test cases to the client; hidden ones stay server-side.
    sampleTests: tests.filter((t) => !t.hidden).map((t) => ({ input: t.input, expectedOutput: t.expectedOutput })),
    totalTests: tests.length,
  };
}

/** Recent submissions for the activity feed. */
export async function getRecentSubmissions(userId: number, limit = 6) {
  const subs = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { problem: { select: { title: true } } },
  });
  return subs.map((s) => ({
    id: s.id,
    title: s.problem.title,
    verdict: s.verdict,
    passedCount: s.passedCount,
    totalCount: s.totalCount,
    createdAt: s.createdAt.toISOString(),
  }));
}
