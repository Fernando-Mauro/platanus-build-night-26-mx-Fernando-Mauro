// Deterministic seed (T018): 5-competency linear chain + 10 hardcoded problems
// + active ModelVersion with demo tuning. Idempotent (upserts by slug).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Linear chain: Arreglos → Loops/Hashing → Recursión → Árboles → Grafos
const TOPICS = [
  { slug: "arreglos",  name: "Arreglos",       order: 1, blurb: "Indexación y recorrido" },
  { slug: "hashing",   name: "Loops/Hashing",  order: 2, blurb: "Tablas y conjuntos" },
  { slug: "recursion", name: "Recursión",      order: 3, blurb: "Casos base y llamadas" },
  { slug: "arboles",   name: "Árboles",        order: 4, blurb: "Recorridos y estructura" },
  { slug: "grafos",    name: "Grafos",         order: 5, blurb: "BFS, DFS y caminos" },
];

// 2 problems per competency (10 total). C++ = Judge0 language id 54.
const CPP = 54;
const tc = (input: string, expectedOutput: string, hidden = false) => ({ input, expectedOutput, hidden });
const PROBLEMS: { slug: string; title: string; difficulty: string; comp: string }[] = [
  { slug: "two-sum",         title: "Two Sum",                 difficulty: "Fácil",  comp: "arreglos" },
  { slug: "max-subarray",    title: "Subarreglo Máximo",       difficulty: "Media",  comp: "arreglos" },
  { slug: "two-sum-hash",    title: "Two Sum (Hashing)",       difficulty: "Fácil",  comp: "hashing" },
  { slug: "group-anagrams",  title: "Agrupar Anagramas",       difficulty: "Media",  comp: "hashing" },
  { slug: "factorial",       title: "Factorial Recursivo",     difficulty: "Fácil",  comp: "recursion" },
  { slug: "fibonacci",       title: "Fibonacci",               difficulty: "Fácil",  comp: "recursion" },
  { slug: "tree-height",     title: "Altura de un Árbol",      difficulty: "Media",  comp: "arboles" },
  { slug: "tree-inorder",    title: "Recorrido Inorden",       difficulty: "Media",  comp: "arboles" },
  { slug: "num-islands",     title: "Número de Islas",         difficulty: "Media",  comp: "grafos" },
  { slug: "course-schedule", title: "Calendario de Cursos",    difficulty: "Difícil", comp: "grafos" },
];

const STARTER = `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Lee la entrada y escribe la salida esperada.
    return 0;
}
`;

async function main() {
  // Topics + competencies (1:1, linear prerequisite chain).
  let prevCompId: number | null = null;
  const compBySlug: Record<string, number> = {};
  for (const t of TOPICS) {
    const topic = await prisma.topic.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name, order: t.order, blurb: t.blurb },
    });
    const comp: { id: number } = await prisma.competency.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, topicId: topic.id, prerequisiteId: prevCompId },
      update: { name: t.name, topicId: topic.id, prerequisiteId: prevCompId },
      select: { id: true },
    });
    compBySlug[t.slug] = comp.id;
    prevCompId = comp.id;
  }

  // Problems + problem↔competency links.
  for (const p of PROBLEMS) {
    const problem = await prisma.problem.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        statement: `Resuelve el problema "${p.title}". (Enunciado de demo para Vértice.)`,
        starterCode: STARTER,
        languageId: CPP,
        testCases: [tc("1\n", "1\n"), tc("2\n", "2\n", true)],
      },
      update: { title: p.title, difficulty: p.difficulty },
    });
    await prisma.problemCompetency.upsert({
      where: { problemId_competencyId: { problemId: problem.id, competencyId: compBySlug[p.comp] } },
      create: { problemId: problem.id, competencyId: compBySlug[p.comp] },
      update: {},
    });
  }

  // Active model version with demo tuning params.
  const existing = await prisma.modelVersion.findFirst({ where: { label: "demo-v1" } });
  if (!existing) {
    await prisma.modelVersion.create({
      data: {
        label: "demo-v1",
        isActive: true,
        params: { learningRate: 15, gateLockBelow: 40, gateUnlockAbove: 45, coldStart: 50 },
      },
    });
  }

  console.log(`Seeded ${TOPICS.length} competencies, ${PROBLEMS.length} problems, 1 model version.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
