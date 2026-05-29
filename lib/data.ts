// ───────────────────────── Domain data (ported from data.jsx) ─────────────────────────
// Static mock data mirroring the design prototype. In the real product this is
// served by the API routes described in specs/.../contracts/api.md.

export type TopicStatus = "mastered" | "learning" | "locked";

export type Topic = {
  id: string;
  name: string;
  icon: string;
  mastery: number;
  status: TopicStatus;
  solved: string;
  left: number;
  top: number;
  blurb: string;
  recommended?: boolean;
  requires?: string;
};

export const TOPICS: Topic[] = [
  { id: "arreglos",  name: "Arreglos",        icon: "IconBrackets", mastery: 94, status: "mastered", solved: "18 / 18", left: 380, top: 24,  blurb: "Indexación y recorrido" },
  { id: "hashing",   name: "Hashing",          icon: "IconHash",     mastery: 78, status: "learning", solved: "11 / 15", left: 150, top: 192, blurb: "Tablas y conjuntos" },
  { id: "punteros",  name: "Dos Punteros",     icon: "IconArrows",   mastery: 66, status: "learning", solved: "7 / 12",  left: 600, top: 192, blurb: "Ventanas e índices" },
  { id: "grafos",    name: "Grafos",           icon: "IconGit",      mastery: 28, status: "learning", solved: "3 / 20",  left: 150, top: 372, blurb: "BFS, DFS y caminos", recommended: true },
  { id: "busqueda",  name: "Búsqueda Binaria", icon: "IconSearch",   mastery: 41, status: "learning", solved: "5 / 14",  left: 600, top: 372, blurb: "Espacio de respuestas" },
  { id: "dp",        name: "Prog. Dinámica",   icon: "IconLayers",   mastery: 0,  status: "locked",   solved: "0 / 22",  left: 382, top: 540, blurb: "Requiere Grafos", requires: "Grafos" },
];

export const EDGES: [string, string][] = [
  ["arreglos", "hashing"],
  ["arreglos", "punteros"],
  ["hashing", "grafos"],
  ["punteros", "busqueda"],
  ["grafos", "dp"],
  ["busqueda", "dp"],
];

export const PROBLEM = {
  number: 1,
  title: "Two Sum",
  subtitle: "Suma de Dos Números",
  difficulty: "Fácil",
  topics: ["Arreglos", "Hashing"],
  acceptance: "54.2 %",
  statement: [
    "Dado un arreglo de enteros nums y un entero target, devuelve los índices de los dos números que suman target.",
    "Puedes asumir que cada entrada tiene exactamente una solución, y no puedes usar el mismo elemento dos veces.",
    "Puedes devolver la respuesta en cualquier orden.",
  ],
  examples: [
    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9, por lo tanto devolvemos [0, 1]." },
    { input: "nums = [3,2,4], target = 6",     output: "[1,2]", explanation: undefined as string | undefined },
  ],
  constraints: [
    "2 ≤ nums.length ≤ 10⁴",
    "−10⁹ ≤ nums[i] ≤ 10⁹",
    "−10⁹ ≤ target ≤ 10⁹",
    "Existe exactamente una solución válida.",
  ],
};

export type Lang = { id: string; label: string; file: string };

export const LANGS: Lang[] = [
  { id: "cpp",        label: "C++",        file: "solution.cpp" },
  { id: "python",     label: "Python",     file: "solution.py" },
  { id: "javascript", label: "JavaScript", file: "solution.js" },
];

export const SOLUTIONS: Record<string, string> = {
  cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int need = target - nums[i];
            if (seen.count(need))
                return {seen[need], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
  python: `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, x in enumerate(nums):
            need = target - x
            if need in seen:
                return [seen[need], i]
            seen[x] = i
        return []`,
  javascript: `function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const need = target - nums[i];
        if (seen.has(need))
            return [seen.get(need), i];
        seen.set(nums[i], i);
    }
    return [];
}`,
};

export const TEST_CASES = [
  { n: 1, input: "nums = [2,7,11,15]\ntarget = 9", expected: "[0,1]", got: "[0,1]" },
  { n: 2, input: "nums = [3,2,4]\ntarget = 6",      expected: "[1,2]", got: "[1,2]" },
  { n: 3, input: "nums = [3,3]\ntarget = 6",        expected: "[0,1]", got: "[0,1]" },
];

export const VERDICT = {
  runtime: "12 ms",    runtimePct: "Más rápido que el 92.4 %",
  memory: "11.8 MB",   memoryPct: "Menos que el 67.1 %",
};

// ───────────────────────── Syntax highlighting ─────────────────────────
const KEYWORDS = new Set(["include","using","namespace","class","public","private","return","for","while","if","else","def","in","const","let","var","function","new","true","false","null","None","nullptr"]);
const TYPES = new Set(["int","vector","unordered_map","string","List","Map","void","auto","bool","self","Solution"]);

export type Token = { txt: string; cls: string | null };

export function tokenizeLine(line: string, lang: string): Token[] {
  const rules: [string, RegExp][] = [
    ["comment", lang === "python" ? /#.*/y : /\/\/.*/y],
    ["pre",     lang === "cpp" ? /#\w+/y : /[^\s\S]/y],
    ["string",  /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
    ["number",  /\b\d+(?:\.\d+)?\b/y],
    ["word",    /[A-Za-z_]\w*/y],
    ["space",   /\s+/y],
    ["punct",   /[^\sA-Za-z_]/y],
  ];
  const out: Token[] = [];
  let i = 0, guard = 0;
  while (i < line.length && guard++ < 5000) {
    let matched = false;
    for (const [type, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(line);
      if (m && m.index === i && m[0].length > 0) {
        const txt = m[0];
        let cls: string | null = null;
        if (type === "comment") cls = "text-zinc-600 italic";
        else if (type === "pre") cls = "text-fuchsia-300";
        else if (type === "string") cls = "text-emerald-300";
        else if (type === "number") cls = "text-orange-300";
        else if (type === "punct") cls = "text-zinc-500";
        else if (type === "word") {
          const after = line.slice(i + txt.length).match(/^\s*\(/);
          if (KEYWORDS.has(txt)) cls = "text-fuchsia-300";
          else if (TYPES.has(txt)) cls = "text-sky-300";
          else if (after) cls = "text-blue-300";
          else cls = "text-zinc-200";
        }
        out.push({ txt, cls });
        i += txt.length;
        matched = true;
        break;
      }
    }
    if (!matched) { out.push({ txt: line[i], cls: "text-zinc-300" }); i++; }
  }
  return out;
}

// ───────────────────────── User & problem list ─────────────────────────
export const USER = {
  name: "Andrea Reyes",
  initials: "AR",
  handle: "@andrea.r",
  rating: 1843,
  streak: 12,
  solved: 44,
  rank: "Especialista",
  rankColor: "text-sky-300",
};

export type ProblemStatus = "solved" | "attempted" | "todo" | "locked";

export type ProblemListItem = {
  id: number;
  number: number;
  title: string;
  subtitle: string;
  difficulty: string;
  topics: string[];
  acceptance: string;
  status: ProblemStatus;
  featured?: boolean;
  recommended?: boolean;
};

export const PROBLEMS: ProblemListItem[] = [
  { id: 1,  number: 1,  title: "Two Sum",                  subtitle: "Suma de Dos Números",      difficulty: "Fácil",   topics: ["Arreglos", "Hashing"],     acceptance: "54.2 %", status: "solved",    featured: true },
  { id: 2,  number: 26, title: "Eliminar Duplicados",      subtitle: "Arreglo ordenado in-situ", difficulty: "Fácil",   topics: ["Arreglos", "Dos Punteros"], acceptance: "58.9 %", status: "solved" },
  { id: 3,  number: 49, title: "Agrupar Anagramas",        subtitle: "Claves canónicas",         difficulty: "Media",   topics: ["Hashing", "Cadenas"],       acceptance: "67.3 %", status: "attempted", recommended: true },
  { id: 4,  number: 11, title: "Contenedor de Más Agua",   subtitle: "Maximizar área",           difficulty: "Media",   topics: ["Dos Punteros", "Greedy"],   acceptance: "55.1 %", status: "todo" },
  { id: 5,  number: 33, title: "Buscar en Arreglo Rotado", subtitle: "Búsqueda binaria",         difficulty: "Media",   topics: ["Búsqueda Binaria"],         acceptance: "40.7 %", status: "todo" },
  { id: 6,  number: 200,title: "Número de Islas",          subtitle: "Componentes conexas",      difficulty: "Media",   topics: ["Grafos", "BFS"],            acceptance: "57.8 %", status: "attempted", recommended: true },
  { id: 7,  number: 207,title: "Calendario de Cursos",     subtitle: "Orden topológico",         difficulty: "Media",   topics: ["Grafos", "DFS"],            acceptance: "46.2 %", status: "todo" },
  { id: 8,  number: 322,title: "Cambio de Monedas",        subtitle: "Mínimo de monedas",        difficulty: "Media",   topics: ["Prog. Dinámica"],           acceptance: "44.5 %", status: "locked" },
  { id: 9,  number: 76, title: "Subcadena Mínima",         subtitle: "Ventana deslizante",       difficulty: "Difícil", topics: ["Dos Punteros", "Hashing"],  acceptance: "41.9 %", status: "todo" },
  { id: 10, number: 297,title: "Serializar Árbol Binario", subtitle: "Recorrido y recons.",      difficulty: "Difícil", topics: ["Grafos", "Árboles"],        acceptance: "57.0 %", status: "locked" },
];

export type ActivityKind = "accepted" | "wrong" | "level";

export const ACTIVITY: { id: number; kind: ActivityKind; title: string; meta: string; when: string }[] = [
  { id: 1, kind: "accepted", title: "Two Sum",                meta: "C++ · 12 ms",     when: "hace 2 h" },
  { id: 2, kind: "wrong",    title: "Agrupar Anagramas",      meta: "Caso 14 fallido", when: "ayer" },
  { id: 3, kind: "accepted", title: "Eliminar Duplicados",    meta: "C++ · 8 ms",      when: "ayer" },
  { id: 4, kind: "level",    title: "Subiste a Especialista", meta: "+62 de rating",   when: "hace 3 días" },
];

// Activity heatmap (contribution-style). Deterministic seed (no Math.random).
export const HEATMAP: number[] = Array.from({ length: 119 }, (_, i) => {
  const seed = (i * 73 + 17) % 101;
  if (seed > 88) return 4;
  if (seed > 74) return 3;
  if (seed > 55) return 2;
  if (seed > 32) return 1;
  return 0;
});
