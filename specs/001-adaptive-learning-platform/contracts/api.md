# API Contract — Next.js App Router (Node.js runtime)

All endpoints are served by the unified Next.js backend under `/api`. Auth via Auth.js session
cookie. Errors use `{ "error": { "code": string, "message": string } }` with appropriate HTTP
status. No endpoint ever returns hidden test-case expected outputs (FR-005).

## Auth

### POST /api/auth/register
Create an account. Body: `{ email, password, displayName? }`.
- 201 → `{ learnerId, email, displayName }` (session established)
- 409 `EMAIL_TAKEN` | 422 `INVALID_INPUT` (FR-001)

### POST /api/auth/[...nextauth] (Auth.js Credentials)
Sign in / sign out / session via Auth.js. Sign-in body: `{ email, password }`.
- 200 → session cookie set; 401 `INVALID_CREDENTIALS`

## Roadmap & content

### GET /api/roadmap
Adaptive roadmap for the signed-in learner (Stories 2 & 3).
- 200 →
  ```json
  {
    "topics": [
      { "id": "...", "name": "Graphs", "order": 3,
        "pMastery": 0.42, "status": "RECOMMENDED",
        "concepts": [ { "id": "...", "name": "DFS", "pMastery": 0.31, "status": "RECOMMENDED" } ] }
    ],
    "recommendation": {
      "reason": "PREREQUISITE_GAP",
      "nextProblemId": "...", "nextConceptId": "...",
      "explanation": "You're struggling with Graphs; practice DFS first."
    }
  }
  ```
- New learner → all topics present with baseline `pMastery` and a defined starting recommendation
  (no cold-start dead end, FR; SC-006).

### GET /api/topics/{topicId}
- 200 → topic detail + its problems `[{ id, title, difficulty }]` (FR-003).

### GET /api/problems/{problemId}
- 200 → `{ id, title, statementMarkdown, timeLimitMs, memoryLimitKb, languageIds,
  sampleTestCases: [{ input, expectedOutput }] }` (only **visible** test cases; FR-004/005).

## Submissions (synchronous, 30 s budget — FR-005a)

### POST /api/submissions
Submit a solution; blocks until verdict or the 30 s wall-clock timeout.
- Body: `{ problemId, languageId, sourceCode }`
- 200 →
  ```json
  {
    "submissionId": "...",
    "verdict": "FAILED",
    "passedCount": 3, "totalCount": 5,
    "runtimeMs": 1840,
    "failedCases": [ { "ordinal": 4, "passed": false } ],
    "masteryDelta": [ { "conceptId": "...", "before": 0.55, "after": 0.41 } ]
  }
  ```
  `failedCases` never includes hidden expected outputs (FR-005). Verdict ∈
  `PASSED|FAILED|LIMIT_EXCEEDED|ERROR`.
- 200 with `verdict: "LIMIT_EXCEEDED"` if the 30 s budget or per-case limit is hit (fail closed,
  FR-005a/006) — never a hanging request, never a silent pass (SC-002).
- 502 `EVALUATION_UNAVAILABLE` (retryable) if Judge0 is unreachable; **no** mastery update is applied
  (edge case: backend unavailable). Mastery update for a completed verdict is applied exactly once
  and persists even if the client disconnected (FR-007/009).
- 401 if unauthenticated; 404 `PROBLEM_NOT_FOUND`; 422 `UNSUPPORTED_LANGUAGE`.

### GET /api/submissions?problemId=&cursor=
- 200 → learner's submission history with verdicts, runtime, attempt numbers (FR-015).

## Notes
- The client shows a loading state for the open submission request (acceptance scenario US1-3).
- All mutating routes are authenticated; a learner can only read/write their own mastery & history.
