// Code evaluation — the submission path. Compiles/runs the submitted code
// against each test case and normalizes the results into a single verdict.
// Fails closed: any internal error → ERROR (no mastery update, FR-014).
//
// Backends, chosen by env EVAL_PROVIDER (default "local"):
//   - "local"  : compile/run on this machine via child_process (g++ / python3 /
//     node). No external service, no sandbox dependency — works offline and is
//     what makes correct→PASSED / wrong→FAILED reliably for the demo.
//   - "piston" : public Piston API (emkc.org), cloud execution, no key.
//   - "judge0" : self-hosted Judge0 or Judge0 CE on RapidAPI.
import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServerEnv, judge0Headers } from "@/lib/config/env";
import type { Verdict } from "@/features/knowledge/update";

export type TestCase = { input: string; expectedOutput: string; hidden?: boolean };

export type EvalResult = {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number | null;
};

// ───────────────────────── shared helpers ─────────────────────────

/** Normalize output for comparison: rstrip each line, drop trailing blank lines. */
function normalize(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ───────────────────────── local backend (default) ─────────────────────────

type RunOut = { stdout: string; exitCode: number | null; timedOut: boolean; spawnError: boolean };

/** Run a command, feed stdin, capture stdout, kill after `timeoutMs`. */
function runProc(
  cmd: string,
  args: string[],
  stdin: string,
  cwd: string,
  timeoutMs = 5000
): Promise<RunOut> {
  return new Promise((resolve) => {
    let stdout = "";
    let settled = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd, args, { cwd });
    } catch {
      resolve({ stdout: "", exitCode: null, timedOut: false, spawnError: true });
      return;
    }
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        resolve({ stdout, exitCode: null, timedOut: true, spawnError: false });
      }
    }, timeoutMs);
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.on("error", () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ stdout: "", exitCode: null, timedOut: false, spawnError: true }); }
    });
    child.on("close", (code) => {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ stdout, exitCode: code, timedOut: false, spawnError: false }); }
    });
    child.stdin?.on("error", () => {}); // ignore EPIPE if the program exits early
    child.stdin?.end(stdin);
  });
}

// Judge0 language id → how we run it locally.
const LOCAL_LANG: Record<number, { ext: string; compile?: string[]; run: (dir: string) => [string, string[]] }> = {
  54: { // C++
    ext: "cpp",
    compile: ["g++", "-O2", "-o", "prog", "main.cpp"],
    run: (dir) => [join(dir, "prog"), []],
  },
  71: { // Python
    ext: "py",
    run: (dir) => ["python3", [join(dir, "main.py")]],
  },
  63: { // JavaScript (Node)
    ext: "js",
    run: (dir) => ["node", [join(dir, "main.js")]],
  },
};

async function evaluateLocal(opts: {
  sourceCode: string;
  languageId: number;
  testCases: TestCase[];
}): Promise<EvalResult> {
  const { sourceCode, languageId, testCases } = opts;
  const total = testCases.length;
  const lang = LOCAL_LANG[languageId] ?? LOCAL_LANG[54];

  const dir = await mkdtemp(join(tmpdir(), "vertice-eval-"));
  try {
    const srcPath = join(dir, `main.${lang.ext}`);
    await writeFile(srcPath, sourceCode);

    // Compile step (compiled languages only). Compile error → ERROR verdict.
    if (lang.compile) {
      const [cc, ...ccArgs] = lang.compile;
      const comp = await runProc(cc, ccArgs, "", dir, 15000);
      if (comp.spawnError) return fail(total); // compiler missing → infra error
      if (comp.exitCode !== 0) {
        return { verdict: "ERROR", passedCount: 0, totalCount: total, runtimeMs: null };
      }
    }

    // Run each test case.
    let passed = 0;
    let anyTimeout = false;
    let maxMs = 0;
    for (const tc of testCases) {
      const [rc, rargs] = lang.run(dir);
      const t0 = Date.now();
      const out = await runProc(rc, rargs, tc.input, dir, 5000);
      maxMs = Math.max(maxMs, Date.now() - t0);
      if (out.spawnError) return fail(total);
      if (out.timedOut) { anyTimeout = true; continue; }
      if (out.exitCode === 0 && normalize(out.stdout) === normalize(tc.expectedOutput)) passed++;
    }

    let verdict: Verdict;
    if (passed === total) verdict = "PASSED";
    else if (passed === 0 && anyTimeout) verdict = "LIMIT_EXCEEDED";
    else verdict = "FAILED";

    return { verdict, passedCount: passed, totalCount: total, runtimeMs: maxMs };
  } catch {
    return fail(total);
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ───────────────────────── Piston backend ─────────────────────────

let proxyInit = false;
async function ensureProxy(): Promise<void> {
  if (proxyInit) return;
  proxyInit = true;
  const proxy =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxy) return;
  try {
    // `undici` ships with Node; loaded dynamically by name so the bundler
    // doesn't try to resolve it at build time.
    const undici = (await import(/* webpackIgnore: true */ "undici" as string)) as {
      ProxyAgent: new (uri: string) => unknown;
      setGlobalDispatcher: (d: unknown) => void;
    };
    undici.setGlobalDispatcher(new undici.ProxyAgent(proxy));
  } catch { /* fall back to direct fetch */ }
}

const PISTON_LANG: Record<number, { language: string; version: string; file: string }> = {
  54: { language: "c++", version: "10.2.0", file: "main.cpp" },
  71: { language: "python", version: "3.10.0", file: "main.py" },
  63: { language: "javascript", version: "18.15.0", file: "main.js" },
};

type PistonRun = { stdout: string; code: number | null; signal: string | null };
type PistonResp = { run?: PistonRun; compile?: PistonRun };

async function evaluatePiston(opts: {
  sourceCode: string;
  languageId: number;
  testCases: TestCase[];
}): Promise<EvalResult> {
  await ensureProxy();
  const { sourceCode, languageId, testCases } = opts;
  const total = testCases.length;
  const endpoint = process.env.PISTON_URL?.replace(/\/$/, "") || "https://emkc.org/api/v2/piston/execute";
  const lang = PISTON_LANG[languageId] ?? PISTON_LANG[54];

  let passed = 0;
  let compileError = false;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          language: lang.language,
          version: lang.version,
          files: [{ name: lang.file, content: sourceCode }],
          stdin: tc.input,
        }),
      });
      if (!res.ok) return fail(total);
      const data = (await res.json()) as PistonResp;
      if (data.compile && data.compile.code !== 0) { compileError = true; continue; }
      const run = data.run;
      if (!run) return fail(total);
      const rerr = (run.code !== 0 && run.code !== null) || run.signal !== null;
      if (!rerr && normalize(run.stdout) === normalize(tc.expectedOutput)) passed++;
    } catch {
      return fail(total);
    }
    if (i < testCases.length - 1) await sleep(250);
  }

  let verdict: Verdict;
  if (passed === total) verdict = "PASSED";
  else if (compileError) verdict = "ERROR";
  else verdict = "FAILED";
  return { verdict, passedCount: passed, totalCount: total, runtimeMs: null };
}

// ───────────────────────── Judge0 backend ─────────────────────────

type Judge0Result = { status_id: number; time?: string | null };
const ACCEPTED = 3;
const J0_INTERNAL = new Set([13, 14]);
const J0_TLE = 5;

async function evaluateJudge0(opts: {
  sourceCode: string;
  languageId: number;
  testCases: TestCase[];
}): Promise<EvalResult> {
  const { sourceCode, languageId, testCases } = opts;
  const total = testCases.length;
  const base = getServerEnv().JUDGE0_URL.replace(/\/$/, "");
  const results: (Judge0Result | null)[] = [];
  for (const tc of testCases) {
    try {
      const res = await fetch(`${base}/submissions?base64_encoded=false&wait=true&fields=status_id,time`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...judge0Headers() },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin: tc.input, expected_output: tc.expectedOutput }),
      });
      results.push(res.ok ? ((await res.json()) as Judge0Result) : null);
    } catch {
      results.push(null);
    }
  }
  if (results.some((r) => r === null)) return fail(total);
  const ok = results as Judge0Result[];
  const passedCount = ok.filter((r) => r.status_id === ACCEPTED).length;
  const runtimeMs = ok.reduce((mx, r) => Math.max(mx, r.time ? Math.round(parseFloat(r.time) * 1000) : 0), 0);
  let verdict: Verdict;
  if (passedCount === total) verdict = "PASSED";
  else if (ok.some((r) => J0_INTERNAL.has(r.status_id))) verdict = "ERROR";
  else if (ok.filter((r) => r.status_id !== ACCEPTED).every((r) => r.status_id === J0_TLE)) verdict = "LIMIT_EXCEEDED";
  else verdict = "FAILED";
  return { verdict, passedCount, totalCount: total, runtimeMs };
}

// ───────────────────────── entry point ─────────────────────────

function fail(total: number): EvalResult {
  return { verdict: "ERROR", passedCount: 0, totalCount: total, runtimeMs: null };
}

export async function evaluate(opts: {
  sourceCode: string;
  languageId: number;
  testCases: TestCase[];
  referenceSolution?: string | null;
}): Promise<EvalResult> {
  const provider0 = (process.env.EVAL_PROVIDER || "judge0").toLowerCase();
  // reference mode doesn't need test cases (it string-matches code).
  if (opts.testCases.length === 0 && provider0 !== "reference") return fail(0);
  // Default backend is Judge0 (what production / `main` uses). Override per-env:
  //   EVAL_PROVIDER=reference  → demo mode: string-match vs the reference solution
  //   EVAL_PROVIDER=local      → compile/run locally via g++/python3/node
  //   EVAL_PROVIDER=piston     → public Piston API
  const provider = (process.env.EVAL_PROVIDER || "judge0").toLowerCase();
  if (provider === "reference") return evaluateReference(opts);
  if (provider === "local") return evaluateLocal(opts);
  if (provider === "piston") return evaluatePiston(opts);
  return evaluateJudge0(opts);
}

// ───────────────────────── reference backend (demo) ─────────────────────────
// Extreme-hardcoded mode for the presentation: no execution at all. The
// submitted code is compared against the problem's reference solution. Exact
// (whitespace-normalized) match → PASSED; anything different → FAILED. Either way
// a real verdict is produced so the Bayesian model reacts. The reference comes in
// via opts.referenceSolution (the route passes it from the DB).

function normalizeCode(s: string): string {
  // Compare ignoring indentation/blank-line/trailing-space noise so cosmetic
  // formatting doesn't break an otherwise-identical answer.
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

async function evaluateReference(opts: {
  sourceCode: string;
  referenceSolution?: string | null;
  testCases: TestCase[];
}): Promise<EvalResult> {
  const total = opts.testCases.length || 1;
  const ref = opts.referenceSolution;
  // No reference on file → treat as correct (don't punish the learner for a
  // missing answer key in demo mode).
  if (!ref) return { verdict: "PASSED", passedCount: total, totalCount: total, runtimeMs: 0 };
  const match = normalizeCode(opts.sourceCode) === normalizeCode(ref);
  return match
    ? { verdict: "PASSED", passedCount: total, totalCount: total, runtimeMs: 0 }
    : { verdict: "FAILED", passedCount: 0, totalCount: total, runtimeMs: 0 };
}
