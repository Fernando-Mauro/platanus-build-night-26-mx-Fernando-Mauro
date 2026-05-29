# Evaluation Boundary Contract — `features/evaluation` (Principle III)

This module is the **only** code permitted to talk to Judge0. The rest of the system depends on this
language-agnostic internal contract, never on Judge0 specifics. Judge0 is reachable only privately
(EC2 SG allows ingress on `:2358` only from the ECS Fargate task SG).

## Internal interface (consumed by `/api/submissions`)

```ts
type Verdict = "PASSED" | "FAILED" | "LIMIT_EXCEEDED" | "ERROR";

interface EvaluateInput {
  languageId: number;
  sourceCode: string;
  testCases: { input: string; expectedOutput: string; ordinal: number }[];
  timeLimitMs: number;      // per test case (Problem.timeLimitMs)
  memoryLimitKb: number;
}

interface EvaluateResult {
  verdict: Verdict;
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  perCase: { ordinal: number; passed: boolean }[];   // NO expected outputs leak out
}

// Single entry point. Fails closed: never throws a "pass"; on outage throws EvaluationUnavailable.
function evaluate(input: EvaluateInput): Promise<EvaluateResult>;
```

## Behavior (normative)

- **Single caller**: only `judge0-client.ts` issues Judge0 HTTP calls; `evaluate.ts` orchestrates.
- **Auth**: every Judge0 request carries the `X-Auth-Token` (Judge0 `AUTHN_TOKEN`) read from Secrets
  Manager at runtime — never hardcoded.
- **Submission**: batch the test cases to Judge0 (`POST /submissions/batch`), enforcing
  `cpu_time_limit` / `memory_limit` per case from `EvaluateInput`.
- **Waiting**: prefer Judge0 `wait=true`; otherwise poll `GET /submissions/batch` until all tokens
  resolve, bounded by a **30 s** overall deadline (FR-005a).
- **Normalization**: map Judge0 status ids → `Verdict`
  (`3 Accepted → PASSED`; wrong-answer → `FAILED`; `5 TLE` / deadline → `LIMIT_EXCEEDED`;
  compile/runtime/internal errors → `ERROR`). Aggregate: all accepted ⇒ `PASSED`, else `FAILED`
  (or `LIMIT_EXCEEDED`/`ERROR` if any case hit a limit/error and none failed on output).
- **Fail closed**: deadline exceeded ⇒ `LIMIT_EXCEEDED`; Judge0 unreachable/5xx ⇒ throw
  `EvaluationUnavailable` (caller returns retryable 502, applies **no** mastery update).
- **No leakage**: hidden expected outputs and Judge0 internal fields never cross back to the caller.
- **Testability**: `evaluate()` is unit-tested with the Judge0 client mocked (Principle III, must
  pass before merge): accepted-all, partial-fail, TLE, compile-error, and outage cases.

## Judge0 service (deployment-side)
- Self-hosted via official `docker-compose` on EC2 (see infra contract + research R2).
- Listens on `:2358`; **not** internet-exposed; SG ingress from the ECS Fargate task SG only.
- `AUTHN_TOKEN` and internal DB/Redis passwords sourced from Secrets Manager / instance metadata.
