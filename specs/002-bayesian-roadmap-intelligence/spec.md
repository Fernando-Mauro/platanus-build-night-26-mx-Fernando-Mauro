# Feature Specification: Bayesian Roadmap Intelligence

**Feature Branch**: `002-bayesian-roadmap-intelligence`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Vamos a definir el núcleo de la inteligencia del sistema. Requerimientos para la Red Bayesiana y el Roadmap: Modelo de Conocimiento: Cada problema estará vinculado a una o más 'Competencias' (ej. Recursión, Arreglos, Loops). Actualización Agresiva: El sistema debe actualizar la probabilidad de maestría del alumno inmediatamente después de cada veredicto de Judge0. Para la demo, el 'Learning Rate' debe ser alto para que 1 o 2 fallos en un tema cambien drásticamente el roadmap. Lógica de Retroalimentación: Si la maestría estimada de un tema baja del 40%, el roadmap debe bloquear el siguiente tema avanzado y sugerir un problema de refuerzo de un tema pre-requisito. Problemas Hardcoded: Define un set inicial de 10 problemas fundamentales sembrados (seeded) en la base de datos para la demo."

## Overview

This feature defines the adaptive intelligence at the heart of the platform: how a learner's
estimated mastery is modeled, how it updates from each evaluation outcome, and how those estimates
reshape the roadmap in real time. It builds on the existing platform (accounts, problem solving,
code evaluation) and the knowledge-model data foundation, and tunes the engine for a **demo-grade,
visibly reactive experience**: a single failure (or two) in a competency should noticeably change
what the roadmap recommends, and dropping below a mastery threshold should gate advanced topics and
steer the learner to prerequisite reinforcement. It also defines a fixed seed set of 10 foundational
problems so the demo is deterministic and self-contained.

## Clarifications

### Session 2026-05-29

- Q: ¿Cuáles son las competencias/temas del seed y su grafo de prerequisitos? → A: Cadena lineal de 5 competencias — Arreglos → Loops/Hashing → Recursión → Árboles → Grafos, con ~2 problemas por competencia (10 en total).
- Q: ¿Magnitud del learning rate (efecto de un fallo y de un acierto)? → A: Suave-agresivo — un fallo baja ~15 puntos y un acierto sube ~15 puntos de maestría (por competencia, antes del reparto multi-competencia). 2 fallos = −30 pts (cumple SC-002).
- Q: ¿Cómo se reparte el efecto de un veredicto entre las competencias de un problema multi-competencia? → A: Reparto igual — el delta total se divide entre el número de competencias del problema (p. ej. −15 en un problema de 2 competencias = −7.5 a cada una).
- Q: ¿Tamaño del margen de estabilidad alrededor del umbral del 40%? → A: Histéresis de ±5 pts — se bloquea al caer por debajo de 40% y solo se re-desbloquea al superar 45%.
- Q: ¿Maestría inicial (cold start) de cada competencia para un alumno nuevo? → A: 50% neutral (prior de incertidumbre bayesiano) para todas las competencias.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mastery updates immediately after each verdict (Priority: P1)

A learner submits a solution to a problem. As soon as the evaluation returns a verdict, the system
updates the learner's estimated mastery for every competency that problem exercises, and the change
is reflected the next time the roadmap or topic view is shown.

**Why this priority**: Immediate, per-verdict updating is the foundation of the entire adaptive
experience — without it there is no live signal to drive recommendations or gating. It is the
minimum viable slice of "intelligence."

**Independent Test**: Seed a problem linked to a competency, submit a correct solution and confirm
that competency's mastery rises; submit an incorrect solution and confirm it falls — each within one
roadmap refresh after the verdict.

**Acceptance Scenarios**:

1. **Given** a learner with a known mastery for competency "Recursión", **When** they submit a
   solution that passes for a problem linked to "Recursión", **Then** the estimated mastery for
   "Recursión" increases and is visible on the next roadmap view.
2. **Given** the same learner, **When** they submit a failing solution for a "Recursión" problem,
   **Then** the estimated mastery for "Recursión" decreases.
3. **Given** a problem linked to multiple competencies (e.g. "Arreglos" and "Loops"), **When** a
   verdict is returned, **Then** the mastery of each linked competency is updated from that verdict.
4. **Given** a verdict has been applied to mastery once, **When** the same verdict is processed again
   (retry/duplicate), **Then** mastery is not changed a second time for that submission.

---

### User Story 2 - Aggressive learning rate makes the roadmap visibly reactive (Priority: P1)

For the demo, the update strength ("learning rate") is high: one or two failures in a competency move
its mastery estimate dramatically, enough to change the roadmap's recommendations on the spot.

**Why this priority**: This is the explicitly requested demo behavior — the adaptivity must be
*observable in seconds*, not after dozens of submissions. It directly shapes the perceived value of
the product in a live demonstration.

**Independent Test**: Starting from a mid-range mastery, submit 1–2 failing solutions in one
competency and confirm the mastery drops by a large, visible margin and that the roadmap's
recommended next step changes as a result.

**Acceptance Scenarios**:

1. **Given** a competency at a mid-range mastery, **When** the learner fails 1–2 problems in it,
   **Then** its estimated mastery drops by a large, immediately visible margin (not a marginal
   nudge).
2. **Given** that drop, **When** the learner returns to the roadmap, **Then** the recommended next
   step has changed compared to before the failures.
3. **Given** the demo configuration, **When** an operator inspects the update strength, **Then** the
   learning rate is a configurable parameter set to an aggressive value for the demo (so it can be
   dialed down later without code changes).

---

### User Story 3 - Mastery drop below 40% gates advanced topics and suggests reinforcement (Priority: P1)

When a learner's estimated mastery for a topic falls below 40%, the roadmap locks the next advanced
topic that depends on it and surfaces a reinforcement problem drawn from a prerequisite topic, so
the learner is guided to shore up the foundation before advancing.

**Why this priority**: This is the headline adaptive behavior — the visible "the system noticed you
are struggling and changed your path" moment. It depends on Stories 1 and 2 producing the mastery
signal.

**Independent Test**: Drive a topic's mastery below 40% (via failures), then confirm the dependent
advanced topic shows as locked and the roadmap recommends a specific reinforcement problem from a
prerequisite topic.

**Acceptance Scenarios**:

1. **Given** a topic whose estimated mastery has fallen below 40%, **When** the learner views the
   roadmap, **Then** the next advanced topic that depends on it is shown as locked.
2. **Given** the same situation, **When** the roadmap is shown, **Then** it recommends a specific
   reinforcement problem from a prerequisite topic (not another problem from the failing advanced
   topic).
3. **Given** the learner then raises that topic's mastery back to/above the threshold via successful
   reinforcement, **When** they view the roadmap, **Then** the previously locked advanced topic
   becomes available again.
4. **Given** a struggling topic that has no defined prerequisite, **When** reinforcement is needed,
   **Then** the system recommends an easier problem within the same topic instead.

---

### Edge Cases

- **Conflicting evidence**: A fast-but-wrong vs slow-but-correct sequence resolves to a coherent
  mastery value rather than oscillating wildly.
- **Threshold flapping**: A learner hovering right at 40% does not flip a topic between
  locked/unlocked on every single submission — a ±5-point hysteresis band applies (lock <40%,
  unlock >45%).
- **First attempt / cold start**: A learner with no history starts at 50% mastery for every
  competency (neutral prior) so the roadmap is never empty or undefined.
- **Multi-competency attribution**: When a problem maps to several competencies, a single verdict's
  effect is shared across them rather than applied at full strength to each independently.
- **Evaluation error (not a real verdict)**: If evaluation fails to produce a real pass/fail verdict
  (e.g. system error), mastery is not updated from that non-result.
- **Mastery bounds**: Estimated mastery never leaves the 0–100% range regardless of streaks of
  failures or successes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST represent "Competencias" (competencies, e.g. Recursión, Arreglos, Loops)
  as first-class knowledge units, and MUST allow each problem to be linked to one or more of them.
- **FR-002**: System MUST maintain, per learner and per competency, an estimated probability of
  mastery expressed on a 0–100% scale.
- **FR-003**: System MUST update the estimated mastery of every competency linked to a problem
  immediately after that problem's evaluation returns a real verdict (pass/fail), before the next
  roadmap view.
- **FR-004**: System MUST raise estimated mastery on a passing verdict and lower it on a failing
  verdict for each linked competency.
- **FR-005**: System MUST apply each verdict to mastery at most once per submission (idempotent
  update), so retries or duplicate processing do not double-count.
- **FR-006**: System MUST use a configurable "learning rate" (update strength) parameter, set for the
  demo so a failing verdict lowers a competency's estimated mastery by ~15 percentage points and a
  passing verdict raises it by ~15 points (per competency, before multi-competency sharing per FR-007).
  This is aggressive enough that 1–2 failures produce a large, visible drop while keeping symmetric,
  visible recovery. The value remains configurable for non-demo use.
- **FR-007**: When a problem maps to multiple competencies, the system MUST distribute a single
  verdict's effect **equally** across those competencies — the total delta divided by the number of
  linked competencies (e.g. a −15 failure on a 2-competency problem applies −7.5 to each) — rather
  than applying full strength to each independently.
- **FR-008**: System MUST derive each topic's mastery from its competencies' estimates so the roadmap
  can reason at the topic level.
- **FR-009**: When a topic's estimated mastery falls below 40%, the system MUST lock the next
  advanced topic(s) that depend on that topic in the roadmap.
- **FR-010**: When a topic's estimated mastery falls below 40%, the system MUST recommend a specific
  reinforcement problem drawn from a prerequisite topic; if no prerequisite exists, it MUST recommend
  an easier problem within the same topic.
- **FR-011**: System MUST re-enable a previously locked advanced topic once the gating topic's
  estimated mastery rises **above 45%** (the upper hysteresis bound), not merely back to 40%.
- **FR-012**: System MUST apply a **±5-point hysteresis band** around the 40% threshold: a topic
  locks when its estimated mastery drops **below 40%** and only re-unlocks when it rises **above 45%**,
  so a learner hovering at the boundary does not flip a topic between locked and unlocked on every
  single submission.
- **FR-013**: System MUST keep estimated mastery within the 0–100% bounds under any sequence of
  verdicts.
- **FR-014**: System MUST NOT update mastery when evaluation does not yield a real pass/fail verdict
  (e.g. an evaluation/system error).
- **FR-015**: System MUST assign every learner an initial estimated mastery of **50%** for each
  competency (a neutral Bayesian uncertainty prior) so a brand-new learner has a complete, navigable
  roadmap. From 50%, a single failure (−15) drops a competency to 35% (below the 40% gate), enabling
  the demo's gating scenario.
- **FR-016**: System MUST provide a fixed seed set of exactly 10 foundational problems, pre-loaded
  for the demo, each linked to its competency(ies), with deterministic content so the demo is
  repeatable. The seed uses a **linear chain of 5 competencies** — Arreglos → Loops/Hashing →
  Recursión → Árboles → Grafos (each later one depends on the previous) — with **~2 problems per
  competency** (10 total).
- **FR-017**: System MUST make the mastery change traceable to the submission that caused it (so the
  demo can show "this failure caused this change").

### Key Entities *(include if feature involves data)*

- **Competency ("Competencia")**: A first-class knowledge unit. The demo seed defines exactly 5 in a
  linear prerequisite chain: Arreglos → Loops/Hashing → Recursión → Árboles → Grafos. A problem links
  to one or more competencies; mastery is tracked per competency.
- **Topic**: A roadmap-level grouping of competencies with prerequisite relationships to other
  topics; its mastery is derived from its competencies. Drives locking/recommendation.
- **Problem**: A coding exercise linked to one or more competencies; the source of verdicts that
  drive mastery updates. Includes the 10 seeded foundational problems.
- **Mastery Estimate**: Per learner, per competency, a 0–100% probability of mastery, with a defined
  initial value, updated per verdict, and traceable to the causing submission. Topic-level mastery is
  derived from these.
- **Verdict**: The pass/fail outcome of an evaluation; the evidence input to a mastery update.
- **Tuning Parameters**: Configurable values governing the engine — the learning rate (update
  strength), the 40% gating threshold, and the stability margin — adjustable without code changes.
- **Recommendation**: The system-derived next step (advance, reinforce via prerequisite, or easier
  same-topic problem) produced from current mastery and topic prerequisites.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any submission that yields a verdict, the affected competency's estimated mastery
  reflects that verdict on the next roadmap view (no stale state beyond a normal page load).
- **SC-002**: From the 50% starting point, 2 consecutive failures in a single-competency problem
  reduce that competency's estimated mastery to ~20% (a ~30-point drop: 50→35→20), demonstrating the
  aggressive learning rate and crossing the 40% gate after the first failure.
- **SC-003**: When a topic's mastery drops below 40%, the dependent advanced topic appears locked and
  a prerequisite reinforcement problem is recommended, observable within one roadmap refresh.
- **SC-004**: Raising a gating topic's mastery back to/above 40% re-enables the previously locked
  advanced topic within one roadmap refresh.
- **SC-005**: 100% of real verdicts result in exactly one mastery update for their submission (no
  missed updates, no double counts).
- **SC-006**: A learner hovering within a small band around 40% does not experience lock/unlock
  flips on more than a small, bounded fraction of consecutive submissions.
- **SC-007**: The demo runs against exactly 10 pre-seeded foundational problems with deterministic
  content, and a new learner always sees a complete roadmap on first login.
- **SC-008**: An operator can change the learning rate, threshold, and stability margin via
  configuration (no code change) and observe the roadmap behavior change accordingly.

## Assumptions

- **Builds on existing platform**: Accounts, problem viewing, code submission, and Judge0-based
  evaluation already exist (feature 001); this feature defines only the mastery/roadmap intelligence
  layered on top.
- **"Competencia" vs "Topic"**: Competencies are the fine-grained units a problem is tagged with;
  topics are the roadmap-level groupings used for locking/recommendation. Topic mastery is an
  aggregate of its competencies (consistent with the existing two-layer knowledge model).
- **Aggressive demo tuning is intentional and reversible**: The high learning rate is a configured
  demo value, not a permanent product decision; it is expected to be lowered for real use.
- **40% threshold and stability margin**: The 40% gating threshold is fixed per the request; the
  stability-margin size is a sensible default (configurable) chosen to prevent flapping.
- **Seed set scope**: The 10 seeded problems are foundational and pre-authored by the team; authoring
  new problems through a UI is out of scope here.
- **Single-learner demo focus**: Cohorts, instructor views, and leaderboards are out of scope.
- **Mastery realized as a Bayesian estimate**: The probability-of-mastery is implemented with the
  Bayesian-network/knowledge-tracing approach already chosen for the project; this spec defines the
  observable behavior, not the internal math.
