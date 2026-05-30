// Judge0 evaluation (T024) — the submission path. Batch-submits every test case
// to the private Judge0 EC2 box, polls for terminal results, and normalizes them
// into a single verdict. Fails closed: any transport/internal error → ERROR
// (no mastery update, FR-014). The ONLY module besides judge0-client that talks
// to Judge0 (Constitution Principle III).
import "server-only";
import { getServerEnv } from "@/lib/config/env";
import type { Verdict } from "@/features/knowledge/update";

export type TestCase = { input: string; expectedOutput: string; hidden?: boolean };

export type EvalResult = {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
};

type Judge0Result = { status_id: number; time?: string | null };

const TERMINAL = (s: number) => s > 2; // 1=queue, 2=processing
const ACCEPTED = 3;
const INTERNAL_ERROR = new Set([13, 14]); // internal error / exec format error
const TLE = 5;

function authHeaders(): HeadersInit {
  const { JUDGE0_AUTHN_TOKEN } = getServerEnv();
  return { "Content-Type": "application/json", "X-Auth-Token": JUDGE0_AUTHN_TOKEN };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Compile + run `sourceCode` against every test case. Bounded to ~30s total;
 * on timeout or any infra failure returns ERROR so mastery is never moved by a
 * non-verdict.
 */
export async function evaluate(opts: {
  sourceCode: string;
  languageId: number;
  testCases: TestCase[];
}): Promise<EvalResult> {
  const { sourceCode, languageId, testCases } = opts;
  const total = testCases.length;
  if (total === 0) return { verdict: "ERROR", passedCount: 0, totalCount: 0, runtimeMs: null };

  const { JUDGE0_URL } = getServerEnv();
  const base = JUDGE0_URL.replace(/\/$/, "");

  try {
    // 1. Batch submit (base64 off; expected_output drives Accepted/Wrong-Answer).
    const submitRes = await fetch(`${base}/submissions/batch?base64_encoded=false`, {
      method: "POST",
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        submissions: testCases.map((tc) => ({
          source_code: sourceCode,
          language_id: languageId,
          stdin: tc.input,
          expected_output: tc.expectedOutput,
        })),
      }),
    });
    if (!submitRes.ok) return fail(total);
    const tokens = ((await submitRes.json()) as { token: string }[])
      .map((t) => t.token)
      .filter(Boolean);
    if (tokens.length !== total) return fail(total);

    // 2. Poll until all terminal (≤ ~30s).
    const deadline = Date.now() + 28_000;
    let results: Judge0Result[] = [];
    while (Date.now() < deadline) {
      const url =
        `${base}/submissions/batch?base64_encoded=false` +
        `&tokens=${tokens.join(",")}&fields=status_id,time`;
      const pollRes = await fetch(url, {
        headers: authHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!pollRes.ok) return fail(total);
      results = ((await pollRes.json()) as { submissions: Judge0Result[] }).submissions ?? [];
      if (results.length === total && results.every((r) => TERMINAL(r.status_id))) break;
      await sleep(900);
    }
    if (results.length !== total || !results.every((r) => TERMINAL(r.status_id))) {
      return fail(total); // timed out
    }

    // 3. Normalize.
    const passedCount = results.filter((r) => r.status_id === ACCEPTED).length;
    const runtimeMs = results.reduce((mx, r) => {
      const t = r.time ? Math.round(parseFloat(r.time) * 1000) : 0;
      return Number.isFinite(t) ? Math.max(mx, t) : mx;
    }, 0);

    let verdict: Verdict;
    if (passedCount === total) verdict = "PASSED";
    else if (results.some((r) => INTERNAL_ERROR.has(r.status_id))) verdict = "ERROR";
    else if (results.filter((r) => r.status_id !== ACCEPTED).every((r) => r.status_id === TLE))
      verdict = "LIMIT_EXCEEDED";
    else verdict = "FAILED";

    return { verdict, passedCount, totalCount: total, runtimeMs };
  } catch {
    return fail(total);
  }
}

function fail(total: number): EvalResult {
  return { verdict: "ERROR", passedCount: 0, totalCount: total, runtimeMs: null };
}
