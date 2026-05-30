// Client-side API helpers (T026/T031/T032). Typed fetch wrappers the React
// components use to consume the real engine APIs. NOT server-only — safe in
// client components. No secrets here; auth rides the session cookie.

export type RoadmapStatus = "LOCKED" | "AVAILABLE" | "RECOMMENDED" | "MASTERED";

export type RoadmapCompetency = {
  id: number;
  slug: string;
  name: string;
  order: number;
  blurb: string | null;
  pMastery: number;
  status: RoadmapStatus;
  prerequisiteId: number | null;
  prerequisiteName: string | null;
  solvedProblemIds: number[];
  totalProblems: number;
  recommended: boolean;
};

export type RoadmapResponse = {
  competencies: RoadmapCompetency[];
  recommendation:
    | { competencyId: number; competencyName: string; problemId: number | null; reason: string }
    | null;
};

export type SubmissionResponse = {
  submissionId: number;
  verdict: "PASSED" | "FAILED" | "LIMIT_EXCEEDED" | "ERROR" | "PENDING";
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
  masteryDelta: { competency: string; before: number; after: number }[];
  gating: { lockedTopic: string | null; recommendedProblemId: number | null; reason: string | null };
};

export type ProblemDetail = {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  statement: string;
  starterCode: string | null;
  languageId: number;
  competencies: { id: number; name: string }[];
  sampleTests: { input: string; expectedOutput: string }[];
  totalTests: number;
};

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json() as Promise<T>;
}

export type ProblemListItem = {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  competencies: { id: number; name: string; slug: string }[];
  attempts: number;
  solved: boolean;
};

export type ActivityItem = {
  id: number;
  title: string;
  verdict: SubmissionResponse["verdict"];
  passedCount: number;
  totalCount: number;
  createdAt: string;
};

export const fetchRoadmap = () => getJSON<RoadmapResponse>("/api/roadmap");

export const fetchProblems = () =>
  getJSON<{ problems: ProblemListItem[] }>("/api/problems").then((r) => r.problems);

export const fetchActivity = () =>
  getJSON<{ activity: ActivityItem[] }>("/api/activity").then((r) => r.activity);

export const fetchProblem = (id: number) =>
  getJSON<{ problem: ProblemDetail }>(`/api/problems/${id}`).then((r) => r.problem);

export async function submitSolution(input: {
  problemId: number;
  sourceCode: string;
  lang?: string;
}): Promise<SubmissionResponse> {
  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`/api/submissions → ${res.status}`);
  return res.json() as Promise<SubmissionResponse>;
}
