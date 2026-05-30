# Mastery / Roadmap Contract (engine behavior)

## POST /api/submissions (extends 001)
On a real terminal verdict, after persisting the submission/verdicts, the route runs the mastery
update **once** (idempotency guard `evidence_applied_at`) for the authenticated learner
(`session.user.id`), then returns the verdict plus the mastery delta:
```json
{
  "submissionId": 123, "verdict": "FAILED",
  "masteryDelta": [ { "competency": "Recursión", "before": 50, "after": 35 } ],
  "gating": { "lockedTopic": "Árboles", "recommendedProblemId": 7, "reason": "PREREQUISITE_GAP" }
}
```
- No mastery update if the verdict is not a real pass/fail (FR-014).
- Multi-competency: delta split equally (FR-007).

## GET /api/roadmap (extends 001)
Returns, for the authenticated learner: each topic with derived `pMastery` + `status`
(LOCKED|AVAILABLE|RECOMMENDED|MASTERED applying ±5 hysteresis), each competency's `pMastery`, and the
current recommendation (advance / prerequisite reinforcement / easier same-topic).
- New learner → all 5 competencies at 50, complete navigable roadmap (FR-015, SC-007).

## Tuning (SC-008)
Learning rate, gate thresholds (40/45), and cold start come from the active `model_versions.params`
record; changing them changes behavior with no code change.

## Traceability (FR-017)
Each `ConceptMastery.last_submission_id` points at the submission that caused the latest change, so the
demo can show "this failure caused this drop."
