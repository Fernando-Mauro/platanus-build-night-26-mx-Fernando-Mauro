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
};

/** All seeded problems with their competencies, ordered by the chain then id. */
export async function listProblems(): Promise<ProblemListItem[]> {
  const problems = await prisma.problem.findMany({
    include: { competencies: { include: { competency: { include: { topic: true } } } } },
    orderBy: { id: "asc" },
  });
  return problems.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    competencies: p.competencies.map((pc) => ({
      id: pc.competency.id,
      name: pc.competency.name,
      slug: pc.competency.slug,
    })),
  }));
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
