# Feature Specification: Adaptive Learning Platform

**Feature Branch**: `001-adaptive-learning-platform`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Construye una plataforma de aprendizaje de programación. Los usuarios se registran y ven un 'Roadmap' de temas (ej. Arrays, Grafos, Programación Dinámica). Cuando entran a un tema, ven problemas de código. El usuario puede escribir código en un editor integrado y enviarlo para su evaluación contra casos de prueba. Característica principal: El progreso no es lineal. Detrás de escena, el sistema utiliza una Red Bayesiana que actualiza la probabilidad de que el alumno domine un tema en base a sus envíos (aciertos, errores, tiempo, intentos). Si el sistema detecta que el alumno falla mucho en 'Grafos', el roadmap se adapta para recomendarle problemas de pre-requisitos (como 'Árboles' o 'Búsqueda en Profundidad')."

## Clarifications

### Session 2026-05-29

- Q: What is the unit/granularity of nodes in the knowledge model (Bayesian network)? → A: Two-layer model — each roadmap topic is backed by finer-grained concept/skill nodes; problems map to concepts; evidence flows concept → topic.
- Q: When a learner provides evidence on one node, should belief propagate to linked nodes? → A: Directional propagation along prerequisite edges — evidence on a node updates its linked prerequisite/dependent nodes' beliefs (e.g. failing Graphs lowers belief in DFS); no full bidirectional inference.
- Q: How do asynchronous evaluation results reach the learner when code is slow to execute? → A: Synchronous wait — the submission request blocks (with a client loading state) until a final verdict or a hard wall-clock timeout, whichever comes first; on timeout it returns a limit-exceeded/error verdict.
- Q: What is the maximum wall-clock time a submission request may block before returning a timeout verdict? → A: 30 seconds (total request budget, distinct from the per-test-case execution limit).
- Q: What happens to an in-flight submission if the learner disconnects before the verdict returns? → A: Evaluation completes server-side regardless; the verdict and mastery update are persisted idempotently and shown in the learner's history on return.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Solve and submit a coding problem (Priority: P1)

A registered learner opens a topic, selects a problem, writes a solution in the integrated
editor, and submits it. The system runs the solution against the problem's test cases and shows
a clear verdict (passed/failed, which cases failed) within seconds.

**Why this priority**: Submitting code and getting an objective verdict is the core loop of the
platform. Without it there is no learning signal and no data to feed the adaptive engine. It is
the minimum viable product on its own.

**Independent Test**: Seed one topic with one problem and its test cases, register a user, write a
known-correct and a known-incorrect solution, and confirm the system returns the correct
pass/fail verdict for each.

**Acceptance Scenarios**:

1. **Given** a learner viewing a problem, **When** they submit a solution that passes all test
   cases, **Then** the system shows an "all tests passed" verdict and records the submission as
   correct.
2. **Given** a learner viewing a problem, **When** they submit a solution that fails one or more
   test cases, **Then** the system shows which cases failed (without revealing hidden expected
   outputs) and records the submission as incorrect.
3. **Given** a learner submits a solution, **When** evaluation is in progress, **Then** the client
   shows a loading/in-progress state while the submission request is open, and the request resolves
   to a final verdict (or a timeout verdict) within a bounded wall-clock time.
4. **Given** a submitted solution that exceeds time or memory limits, **When** evaluation completes,
   **Then** the system reports a limit-exceeded verdict rather than a crash or silent pass.

---

### User Story 2 - View a roadmap of topics and track mastery (Priority: P1)

After registering, a learner sees a roadmap of programming topics (e.g. Arrays, Trees, Graphs,
Dynamic Programming) showing their current estimated mastery of each topic and which topics are
available to work on.

**Why this priority**: The roadmap is the learner's home base and the surface on which adaptivity
is expressed. It is required for the learner to navigate to problems (Story 1) and to perceive
progress.

**Independent Test**: Register a user and confirm the roadmap renders all topics with an initial
mastery estimate and a clear indication of where to start, before any submissions exist.

**Acceptance Scenarios**:

1. **Given** a newly registered learner, **When** they open the roadmap, **Then** they see all
   topics with a baseline mastery estimate and at least one recommended starting topic.
2. **Given** a learner with prior submissions, **When** they open the roadmap, **Then** each
   topic reflects an up-to-date mastery estimate consistent with their submission history.
3. **Given** a learner selects a topic from the roadmap, **When** they enter it, **Then** they see
   the list of problems for that topic.

---

### User Story 3 - Adaptive recommendation based on mastery (Priority: P2)

As a learner submits solutions, the system continuously re-estimates the probability that they
have mastered each topic based on outcomes (correct/incorrect), time taken, and number of
attempts. When the system detects persistent struggle in a topic (e.g. Graphs), it adapts the
roadmap to recommend prerequisite topics (e.g. Trees, Depth-First Search) before continuing.

**Why this priority**: This is the platform's differentiating feature — non-linear, personalized
progression. It depends on Stories 1 and 2 existing first, so it is P2, but it is the primary
reason the product exists.

**Independent Test**: Simulate a learner repeatedly failing problems in a topic that has defined
prerequisites, then confirm the roadmap surfaces those prerequisite topics/problems as the next
recommendation, and that succeeding in them raises the recommendation back toward the original
topic.

**Acceptance Scenarios**:

1. **Given** a learner repeatedly fails problems in a topic with defined prerequisites, **When**
   their estimated mastery of that topic stays below the struggle threshold, **Then** the roadmap
   recommends prerequisite topics/problems instead of more of the same difficulty.
2. **Given** a learner's mastery estimate for a topic rises above the mastery threshold, **When**
   they next open the roadmap, **Then** the topic is marked as mastered and later/dependent topics
   become recommended.
3. **Given** a single new submission, **When** evaluation completes, **Then** the mastery estimate
   for the relevant topic (and any linked prerequisite topics) updates to reflect the new evidence.
4. **Given** two learners with different submission histories, **When** they each open the roadmap,
   **Then** their recommended next steps differ according to their individual mastery estimates.

---

### User Story 4 - Register and sign in (Priority: P1)

A new user creates an account and signs in so their roadmap, mastery estimates, and submission
history are saved and tied to their identity across sessions.

**Why this priority**: Personalized, non-linear progress requires a persistent identity. Without
accounts there is no per-user mastery state to adapt.

**Independent Test**: Register a new account, sign out, sign back in, and confirm the prior
mastery state and submission history are restored.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they register with valid credentials, **Then** an account is
   created and they land on their roadmap with baseline mastery.
2. **Given** a returning learner, **When** they sign in, **Then** their saved roadmap, mastery
   estimates, and submission history are restored.
3. **Given** invalid or duplicate registration details, **When** they attempt to register, **Then**
   the system rejects it with a clear, non-sensitive error message.

---

### Edge Cases

- **Evaluation backend unavailable**: When the evaluation engine is unreachable or times out, the
  submission is marked as a retryable error (never a silent pass) and the mastery estimate is not
  updated until a real verdict exists.
- **Duplicate/rapid resubmissions**: Repeated identical submissions or rapid-fire submissions are
  handled idempotently so mastery estimates are not double-counted from a single attempt.
- **Abandoned in-flight submission**: If the learner closes the tab or loses connection before the
  verdict returns, evaluation still completes server-side; the verdict and resulting mastery update
  are persisted (idempotently) and appear in the learner's submission history when they return.
- **Topic with no defined prerequisites**: When a struggling topic has no prerequisites, the system
  recommends easier problems within the same topic rather than a different topic.
- **Cold start**: A brand-new learner with no history receives sensible baseline estimates and a
  defined entry point rather than an empty or undefined roadmap.
- **Conflicting evidence**: Fast-but-wrong vs slow-but-correct submissions resolve to a coherent
  mastery estimate rather than oscillating wildly.
- **Code that never terminates / infinite loop**: Bounded by enforced time limits and reported as
  limit-exceeded.
- **Mastery oscillation near threshold**: A learner hovering at the threshold does not get
  whiplash between "mastered" and "recommend prerequisites" on every submission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow visitors to register an account and returning learners to sign in,
  persisting each learner's data against their identity.
- **FR-002**: System MUST present a roadmap of programming topics, showing for each topic the
  learner's current estimated mastery and whether it is locked, available, recommended, or mastered.
- **FR-003**: System MUST allow a learner to open a topic and view its associated coding problems.
- **FR-004**: System MUST provide an integrated code editor in which a learner can write and edit a
  solution and submit it for evaluation.
- **FR-005**: System MUST evaluate a submitted solution against the problem's defined test cases and
  return a verdict (passed / failed / limit-exceeded / error), indicating which cases failed without
  exposing hidden expected outputs.
- **FR-005a**: System MUST process a submission synchronously: the submission request blocks until a
  final verdict or a hard wall-clock timeout is reached (whichever comes first), while the client
  shows a loading/in-progress state. If the wall-clock timeout is reached before a verdict, the
  system MUST return a limit-exceeded/error verdict rather than leaving the request hanging. The
  hard wall-clock timeout is 30 seconds total per submission (distinct from the per-test-case
  execution limit in FR-006).
- **FR-006**: System MUST enforce execution time and memory limits on every submission and report a
  limit-exceeded verdict when exceeded.
- **FR-007**: System MUST record every submission with its outcome, time taken, and attempt count
  for the learner and problem. A submission that completes evaluation MUST be persisted with its
  verdict and mastery update even if the learner has disconnected, and be visible in their history.
- **FR-008**: System MUST maintain, per learner, a probabilistic estimate of mastery at the concept
  level (updated directly from submission evidence: correctness, time, attempts) and a derived
  topic-level estimate aggregated from the topic's concepts.
- **FR-009**: System MUST update the relevant mastery estimate(s) after each completed evaluation,
  such that the update is idempotent for a given submission and traceable to it.
- **FR-009a**: System MUST propagate evidence directionally along prerequisite edges — a submission
  affecting one node also updates the beliefs of its linked prerequisite/dependent nodes (e.g.
  repeated failure in Graphs lowers confidence in its prerequisites such as DFS). The system MUST
  NOT perform full bidirectional inference across the entire connected network.
- **FR-010**: System MUST model relationships between topics and between concepts
  (prerequisites/dependencies), and the mapping of problems to concepts, so that mastery and
  recommendations can account for foundational concepts and topics.
- **FR-011**: System MUST recommend prerequisite topics or easier problems when a learner's
  estimated mastery of a topic remains below a defined struggle threshold.
- **FR-012**: System MUST mark a topic as mastered and unlock/recommend dependent topics when the
  estimated mastery rises above a defined mastery threshold.
- **FR-013**: System MUST produce learner-specific recommendations such that learners with different
  histories receive different next steps.
- **FR-014**: System MUST treat learner-submitted code as untrusted and prevent it from affecting
  other learners, their data, or platform integrity.
- **FR-015**: System MUST allow a learner to view their submission history and current mastery per
  topic.
- **FR-016**: System MUST apply hysteresis/stability so mastery status does not oscillate on every
  individual submission near a threshold.

### Key Entities *(include if feature involves data)*

- **Learner**: A registered user. Has credentials/identity, and is the owner of mastery state and
  submission history.
- **Topic**: A roadmap-level unit (e.g. Arrays, Graphs, Dynamic Programming). Has a name,
  description, prerequisite relationships to other topics, and is backed by one or more Concepts.
  Topics are the upper layer of the two-layer knowledge model.
- **Concept (Skill)**: A finer-grained skill node beneath a topic (e.g. under Graphs: adjacency
  representation, BFS, DFS). Concepts are the lower layer of the knowledge model; problems map to
  concepts, and a topic's mastery is derived from its concepts' mastery (evidence flows
  concept → topic). Concepts may also be prerequisites of one another.
- **Problem**: A coding exercise that maps to one or more Concepts (and thereby to a Topic). Has a
  statement, constraints (time/memory), and a set of test cases (some visible, some hidden).
- **Test Case**: An input/expected-output pair (visible or hidden) used to evaluate a submission.
- **Submission**: A learner's attempt at a problem at a point in time. Records the code, the
  resulting verdict, time taken, and attempt number; is the evidence that drives mastery updates.
- **Mastery Estimate**: A probability that the learner has mastered a given node. Tracked at the
  concept level (the lower layer, updated directly from submission evidence) and derived/aggregated
  at the topic level (the upper layer). Versioned so the model can be updated/retrained without
  losing learner state.
- **Knowledge Model**: The two-layer structure linking topics, their backing concepts, the
  prerequisite dependencies among them, and the parameters that govern how submission evidence
  translates into mastery updates and recommendations.
- **Recommendation**: The system-derived "what to do next" for a learner, derived from current
  mastery estimates and topic dependencies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner receives a verdict on a submission in under 10 seconds for typical
  solutions, and in no case waits longer than the 30-second hard timeout before getting a verdict
  (a timeout verdict if execution exceeds it).
- **SC-002**: 100% of submissions resolve to an explicit verdict (passed/failed/limit-exceeded/
  error) — no submission is left without a result or silently treated as passing.
- **SC-003**: After a learner accumulates a consistent failure pattern in a topic with defined
  prerequisites, the roadmap surfaces a prerequisite recommendation within the next roadmap view.
- **SC-004**: A learner's mastery estimate for a topic reflects their latest submission within one
  roadmap refresh (no stale state requiring manual reload beyond a normal page load).
- **SC-005**: Two learners with materially different submission histories receive different
  recommended next steps at least as often as their histories diverge (personalization is observable,
  not uniform).
- **SC-006**: A new learner always sees a non-empty roadmap with a defined starting point on first
  login (no cold-start dead end).
- **SC-007**: Submitted code cannot read or modify another learner's data or the platform's state,
  verified by isolation testing.
- **SC-008**: Mastery status for a learner near a threshold does not flip on more than a small,
  bounded fraction of consecutive submissions (stability is observable).

## Assumptions

- **Authentication**: Standard email/password (or equivalent session-based) authentication is
  sufficient for v1; enterprise SSO is out of scope.
- **Content authoring is out of scope for v1**: Topics, their prerequisite graph, problems, and
  test cases are pre-authored/seeded by the platform team. A learner-facing or admin-facing content
  authoring UI is not part of this feature.
- **Supported languages**: Submissions are accepted in a defined, fixed set of programming languages
  supported by the evaluation engine; the exact list is a content/configuration decision, not a
  scope decision for this spec.
- **Mastery mechanism**: The probabilistic mastery estimate is realized with a Bayesian-network-style
  model as described by the user; the spec defines the observable behavior (updates from evidence,
  prerequisite-aware recommendations) rather than the internal math.
- **Thresholds**: "Struggle" and "mastery" thresholds (e.g. probability cutoffs) and hysteresis
  margins are configurable parameters with sensible defaults; their exact tuned values are a tuning
  detail, not a scope decision.
- **Single learner perspective**: v1 targets individual self-paced learners; cohorts, classrooms,
  instructor dashboards, and leaderboards are out of scope.
- **Connectivity**: Learners have stable internet connectivity; offline use is out of scope.
- **Evaluation engine**: An external sandboxed code-execution/evaluation service is available to run
  submissions against test cases under enforced limits.
