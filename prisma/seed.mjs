// Deterministic seed: 5-competency linear chain + 10 REAL problems with
// statements, starter code and stdin/stdout test cases that Judge0 grades.
// Plain ESM (.mjs) so it runs with `node` in the production container — no tsx /
// TypeScript needed at runtime. Idempotent (upserts by slug).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Linear chain: Arreglos → Loops/Hashing → Recursión → Árboles → Grafos
const TOPICS = [
  { slug: "arreglos",  name: "Arreglos",       order: 1, blurb: "Indexación y recorrido" },
  { slug: "hashing",   name: "Loops/Hashing",  order: 2, blurb: "Tablas y conjuntos" },
  { slug: "recursion", name: "Recursión",      order: 3, blurb: "Casos base y llamadas" },
  { slug: "arboles",   name: "Árboles",        order: 4, blurb: "Recorridos y estructura" },
  { slug: "grafos",    name: "Grafos",         order: 5, blurb: "Recorrido y cadenas" },
];

const CPP = 54; // Judge0 language id for C++ (GCC)
const tc = (input, expectedOutput, hidden = false) => ({ input, expectedOutput, hidden });

const PROBLEMS = [
  // ───────── Arreglos ─────────
  {
    slug: "two-sum",
    title: "Suma de un Arreglo",
    difficulty: "Fácil",
    comp: "arreglos",
    statement:
      "Dado un arreglo de enteros, imprime la suma de todos sus elementos.\n\n" +
      "Entrada:\n- Línea 1: un entero n (tamaño del arreglo).\n- Línea 2: n enteros separados por espacio.\n\n" +
      "Salida:\n- La suma de los n enteros.\n\nEjemplo:\nEntrada:\n3\n1 2 3\nSalida:\n6",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n    // TODO: imprime la suma\n    return 0;\n}\n",
    tests: [tc("3\n1 2 3\n", "6\n"), tc("1\n5\n", "5\n"), tc("5\n10 20 30 40 50\n", "150\n", true)],
  },
  {
    slug: "max-subarray",
    title: "Máximo de un Arreglo",
    difficulty: "Fácil",
    comp: "arreglos",
    statement:
      "Dado un arreglo de enteros, imprime el valor máximo.\n\n" +
      "Entrada:\n- Línea 1: un entero n.\n- Línea 2: n enteros separados por espacio.\n\n" +
      "Salida:\n- El elemento más grande.\n\nEjemplo:\nEntrada:\n3\n1 5 2\nSalida:\n5",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n    // TODO: imprime el máximo\n    return 0;\n}\n",
    tests: [tc("3\n1 5 2\n", "5\n"), tc("4\n-1 -5 -2 -9\n", "-1\n"), tc("5\n3 3 3 7 1\n", "7\n", true)],
  },
  // ───────── Loops / Hashing ─────────
  {
    slug: "two-sum-hash",
    title: "Contar Elementos Distintos",
    difficulty: "Fácil",
    comp: "hashing",
    statement:
      "Dado un arreglo, imprime cuántos valores DISTINTOS contiene.\n\n" +
      "Entrada:\n- Línea 1: un entero n.\n- Línea 2: n enteros.\n\n" +
      "Salida:\n- La cantidad de valores únicos.\n\nEjemplo:\nEntrada:\n5\n1 2 2 3 3\nSalida:\n3",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    // TODO: usa un set/unordered_set y cuenta distintos\n    return 0;\n}\n",
    tests: [tc("5\n1 2 2 3 3\n", "3\n"), tc("4\n7 7 7 7\n", "1\n"), tc("6\n1 2 3 4 5 6\n", "6\n", true)],
  },
  {
    slug: "group-anagrams",
    title: "¿Existe un Par que Sume al Objetivo?",
    difficulty: "Media",
    comp: "hashing",
    statement:
      "Dado un arreglo y un objetivo, indica si existen DOS elementos (en posiciones distintas) cuya suma sea igual al objetivo.\n\n" +
      "Entrada:\n- Línea 1: un entero n.\n- Línea 2: n enteros.\n- Línea 3: el objetivo.\n\n" +
      "Salida:\n- 1 si existe ese par, 0 si no.\n\nEjemplo:\nEntrada:\n4\n2 7 11 15\n9\nSalida:\n1",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n    long long target; cin >> target;\n    // TODO: imprime 1 si hay un par que suma target, si no 0\n    return 0;\n}\n",
    tests: [tc("4\n2 7 11 15\n9\n", "1\n"), tc("3\n1 2 3\n7\n", "0\n"), tc("5\n5 5 1 2 3\n10\n", "1\n", true)],
  },
  // ───────── Recursión ─────────
  {
    slug: "factorial",
    title: "Factorial",
    difficulty: "Fácil",
    comp: "recursion",
    statement:
      "Dado un entero n (0 ≤ n ≤ 20), imprime n! (factorial).\n\n" +
      "Entrada:\n- Un entero n.\n\nSalida:\n- n!\n\nEjemplo:\nEntrada:\n5\nSalida:\n120",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long fact(int n){\n    // TODO: caso base y caso recursivo\n    return 1;\n}\nint main(){\n    int n; cin >> n;\n    cout << fact(n) << \"\\n\";\n    return 0;\n}\n",
    tests: [tc("5\n", "120\n"), tc("0\n", "1\n"), tc("10\n", "3628800\n", true)],
  },
  {
    slug: "fibonacci",
    title: "Fibonacci",
    difficulty: "Fácil",
    comp: "recursion",
    statement:
      "Imprime el n-ésimo número de Fibonacci, con F(0)=0 y F(1)=1.\n\n" +
      "Entrada:\n- Un entero n (0 ≤ n ≤ 45).\n\nSalida:\n- F(n).\n\nEjemplo:\nEntrada:\n7\nSalida:\n13",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long fib(int n){\n    // TODO: F(0)=0, F(1)=1\n    return 0;\n}\nint main(){\n    int n; cin >> n;\n    cout << fib(n) << \"\\n\";\n    return 0;\n}\n",
    tests: [tc("0\n", "0\n"), tc("7\n", "13\n"), tc("10\n", "55\n", true)],
  },
  // ───────── Árboles (recursión estructural) ─────────
  {
    slug: "tree-height",
    title: "Potencia (a elevado a b)",
    difficulty: "Media",
    comp: "arboles",
    statement:
      "Calcula a^b usando recursión. Se garantiza que el resultado cabe en 64 bits.\n\n" +
      "Entrada:\n- Una línea con dos enteros: a y b (0 ≤ b ≤ 60).\n\n" +
      "Salida:\n- a elevado a la b.\n\nEjemplo:\nEntrada:\n2 10\nSalida:\n1024",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long power(long long a, long long b){\n    // TODO: caso base b==0 y caso recursivo\n    return 1;\n}\nint main(){\n    long long a, b; cin >> a >> b;\n    cout << power(a, b) << \"\\n\";\n    return 0;\n}\n",
    tests: [tc("2 10\n", "1024\n"), tc("5 0\n", "1\n"), tc("3 4\n", "81\n", true)],
  },
  {
    slug: "tree-inorder",
    title: "Suma de 1 a N",
    difficulty: "Fácil",
    comp: "arboles",
    statement:
      "Calcula la suma 1 + 2 + ... + n usando recursión.\n\n" +
      "Entrada:\n- Un entero n (1 ≤ n ≤ 100000).\n\nSalida:\n- La suma de 1 a n.\n\nEjemplo:\nEntrada:\n5\nSalida:\n15",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long suma(long long n){\n    // TODO: recursión\n    return 0;\n}\nint main(){\n    long long n; cin >> n;\n    cout << suma(n) << \"\\n\";\n    return 0;\n}\n",
    tests: [tc("5\n", "15\n"), tc("1\n", "1\n"), tc("100\n", "5050\n", true)],
  },
  // ───────── Grafos (recorrido / cadenas) ─────────
  {
    slug: "num-islands",
    title: "Invertir una Cadena",
    difficulty: "Fácil",
    comp: "grafos",
    statement:
      "Dada una cadena de texto (sin espacios), imprímela al revés.\n\n" +
      "Entrada:\n- Una línea con la cadena.\n\nSalida:\n- La cadena invertida.\n\nEjemplo:\nEntrada:\nhola\nSalida:\naloh",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    string s; cin >> s;\n    // TODO: imprime s al revés\n    return 0;\n}\n",
    tests: [tc("hola\n", "aloh\n"), tc("abc\n", "cba\n"), tc("vertice\n", "ecitrev\n", true)],
  },
  {
    slug: "course-schedule",
    title: "Contar Números Pares",
    difficulty: "Fácil",
    comp: "grafos",
    statement:
      "Dado un arreglo de enteros, imprime cuántos son pares.\n\n" +
      "Entrada:\n- Línea 1: un entero n.\n- Línea 2: n enteros.\n\n" +
      "Salida:\n- La cantidad de números pares.\n\nEjemplo:\nEntrada:\n5\n1 2 3 4 6\nSalida:\n3",
    starter:
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    // TODO: cuenta cuántos son pares (x % 2 == 0)\n    return 0;\n}\n",
    tests: [tc("5\n1 2 3 4 6\n", "3\n"), tc("3\n1 3 5\n", "0\n"), tc("4\n2 4 6 8\n", "4\n", true)],
  },
];

async function main() {
  let prevCompId = null;
  const compBySlug = {};
  for (const t of TOPICS) {
    const topic = await prisma.topic.upsert({
      where: { slug: t.slug },
      create: t,
      update: { name: t.name, order: t.order, blurb: t.blurb },
    });
    const comp = await prisma.competency.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, topicId: topic.id, prerequisiteId: prevCompId },
      update: { name: t.name, topicId: topic.id, prerequisiteId: prevCompId },
      select: { id: true },
    });
    compBySlug[t.slug] = comp.id;
    prevCompId = comp.id;
  }

  // Complete reference solutions per problem (demo "reference" eval mode). The
  // editor is pre-filled with this; submitting it unchanged = correct, removing
  // anything = wrong → the Bayesian model reacts. Keyed by slug.
  const REFERENCE = {
    "two-sum":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    long long s = 0, x;\n    for (int i = 0; i < n; i++) { cin >> x; s += x; }\n    cout << s << \"\\n\";\n    return 0;\n}\n",
    "max-subarray":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    long long x, mx = LLONG_MIN;\n    for (int i = 0; i < n; i++) { cin >> x; mx = max(mx, x); }\n    cout << mx << \"\\n\";\n    return 0;\n}\n",
    "two-sum-hash":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    set<long long> s; long long x;\n    for (int i = 0; i < n; i++) { cin >> x; s.insert(x); }\n    cout << s.size() << \"\\n\";\n    return 0;\n}\n",
    "group-anagrams":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    vector<long long> a(n);\n    for (auto &x : a) cin >> x;\n    long long target; cin >> target;\n    set<long long> seen;\n    bool found = false;\n    for (auto x : a) { if (seen.count(target - x)) { found = true; break; } seen.insert(x); }\n    cout << (found ? 1 : 0) << \"\\n\";\n    return 0;\n}\n",
    factorial:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long fact(int n){\n    if (n <= 1) return 1;\n    return (long long)n * fact(n - 1);\n}\nint main(){\n    int n; cin >> n;\n    cout << fact(n) << \"\\n\";\n    return 0;\n}\n",
    fibonacci:
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long fib(int n){\n    if (n < 2) return n;\n    return fib(n - 1) + fib(n - 2);\n}\nint main(){\n    int n; cin >> n;\n    cout << fib(n) << \"\\n\";\n    return 0;\n}\n",
    "tree-height":
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long power(long long a, long long b){\n    if (b == 0) return 1;\n    return a * power(a, b - 1);\n}\nint main(){\n    long long a, b; cin >> a >> b;\n    cout << power(a, b) << \"\\n\";\n    return 0;\n}\n",
    "tree-inorder":
      "#include <bits/stdc++.h>\nusing namespace std;\nlong long suma(long long n){\n    if (n == 0) return 0;\n    return n + suma(n - 1);\n}\nint main(){\n    long long n; cin >> n;\n    cout << suma(n) << \"\\n\";\n    return 0;\n}\n",
    "num-islands":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    string s; cin >> s;\n    reverse(s.begin(), s.end());\n    cout << s << \"\\n\";\n    return 0;\n}\n",
    "course-schedule":
      "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n    int n; cin >> n;\n    long long x; int pares = 0;\n    for (int i = 0; i < n; i++) { cin >> x; if (x % 2 == 0) pares++; }\n    cout << pares << \"\\n\";\n    return 0;\n}\n",
  };

  for (const p of PROBLEMS) {
    const ref = REFERENCE[p.slug] ?? p.starter;
    const problem = await prisma.problem.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        starterCode: ref, // editor shows the complete solution (demo)
        referenceSolution: ref,
        languageId: CPP,
        testCases: p.tests,
      },
      update: {
        title: p.title,
        difficulty: p.difficulty,
        statement: p.statement,
        starterCode: ref,
        referenceSolution: ref,
        languageId: CPP,
        testCases: p.tests,
      },
    });
    await prisma.problemCompetency.upsert({
      where: { problemId_competencyId: { problemId: problem.id, competencyId: compBySlug[p.comp] } },
      create: { problemId: problem.id, competencyId: compBySlug[p.comp] },
      update: {},
    });
  }

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
