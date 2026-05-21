# Tasks: Agent Flight Recorder — Phase 2 (Trace Branching, Diff, Loop Detection)

**Scope Guard (CRITICAL)**: This task list is **Phase 2 only**.

Do **not** implement:
- distributed infrastructure (queues, microservices, OpenTelemetry pipelines/collectors, Kubernetes)
- multi-tenant hosting/auth
- any mutation of historical trace event rows

**Input**: Design documents in `specs/002-trace-branching/` (`spec.md`, `plan.md`, plus optional docs).

**Constitution Gates (must hold throughout)**
- Event schema is the source of truth.
- No UI or backend logic bypasses shared contracts.
- Adapters emit normalized events deterministically.
- Replay safety: immutable event storage, preserved relationships, deterministic reconstruction.
- Lineage: append-only and acyclic.
- Tests are mandatory for schema, adapters, replay/fork/diff/analysis behavior.

---

## Phase 1: Setup (Fixtures + Test Utilities)

- [ ] T001 Create Phase 2 trace fixtures in apps/collector/src/__fixtures__/phase2/ (base trace, forked trace, sibling branches, multi-agent handoff cycle)
- [ ] T002 [P] Add fixture loader helpers in apps/collector/src/testUtils.ts and apps/web/src/testUtils.ts

---

## Phase 2: Foundational (Contracts + SQLite Migrations) ✅ BLOCKS ALL USER STORIES

### Contracts / Schema Evolution (contract-first)

- [ ] T003 Add deterministic ordering helpers `compareTraceEvents` + `sortTraceEventsDeterministic` in packages/contracts/src/index.ts
- [ ] T004 [P] Add ordering determinism tests in packages/contracts/src/index.test.ts
- [ ] T005 Add Phase 2 contract schemas for lineage + fork + diff + enriched loops in packages/contracts/src/index.ts (TraceForkRequest/Response, TraceLineageGraph, TraceLineageEdge, TraceAnalysis loop fields, TraceDiffResult divergence metadata)
- [ ] T006 [P] Add contract parsing/validation tests for new schemas in packages/contracts/src/index.test.ts

### SQLite Storage Evolution (append-only; additive migrations)

- [ ] T007 Add `trace_derivations` table + indexes in apps/collector/src/sqlite/migrate.ts (append-only lineage edges)
- [ ] T008 [P] Add SQLite migration verification tests in apps/collector/src/sqliteStore.test.ts (assert `trace_derivations` exists and is indexed)

**Checkpoint**: Contracts compile + SQLite migrations are in place; user stories can proceed.

---

## Phase 3: User Story 1 — Fork a Trace and Track Lineage (Priority: P1) 🎯 MVP

**Goal**: Create derived traces via fork (append-only), persist lineage edges (acyclic), and navigate lineage in the UI with a branch-aware replay timeline.

**Independent Test**: Emit a base trace, fork from a selected span with an override, then verify:
- parent trace is unchanged
- derived trace exists and is linked in lineage
- UI shows breadcrumb + siblings and can jump to fork point

### 1) Tests (write first; must fail before implementation)

- [ ] T009 [P] [US1] Add fork + lineage API contract tests in apps/collector/src/server.test.ts (POST /v1/traces/:id/fork, GET /v1/traces/:id/lineage)
- [ ] T010 [P] [US1] Add SqliteTraceStore fork + lineage unit tests in apps/collector/src/sqliteStore.test.ts (append-only, parent unchanged, acyclic enforcement, deterministic ordering)
- [ ] T011 [P] [US1] Add web lineage UI pure-function tests in apps/web/src/lineage.test.ts (breadcrumb building, sibling ordering, fork-point jump mapping)

### 2) SQLite Store (lineage + fork; deterministic)

- [ ] T012 [US1] Implement append-only derivation insert with acyclic validation in apps/collector/src/sqliteStore.ts (reject if child already derived; reject parent-in-descendants cycle)
- [ ] T013 [US1] Implement lineage graph reconstruction in apps/collector/src/sqliteStore.ts (recursive ancestor chain + deterministic child ordering)
- [ ] T014 [US1] Implement deterministic fork prefix selection in apps/collector/src/sqliteStore.ts using `sortTraceEventsDeterministic` from @afr/contracts
- [ ] T015 [US1] Implement `forkTrace` in apps/collector/src/sqliteStore.ts (copy prefix events with preserved spanIds, apply override at fork point, append note event, persist trace_derivations row)

### 3) Collector HTTP API (contract-driven)

- [ ] T016 [US1] Add POST /v1/traces/:traceId/fork endpoint in apps/collector/src/server.ts (validate request via @afr/contracts; validate response)
- [ ] T017 [US1] Add GET /v1/traces/:traceId/lineage endpoint in apps/collector/src/server.ts (validate response via @afr/contracts)

### 4) Web UI (lineage navigation + replay timeline enhancements)

- [ ] T018 [P] [US1] Extend web API client in apps/web/src/api.ts with fork + lineage methods (parse responses with @afr/contracts)
- [ ] T019 [US1] Add lineage panel UI in apps/web/src/App.tsx (breadcrumb root→current, sibling branches list, derivedFrom display)
- [ ] T020 [US1] Add replay timeline enhancements in apps/web/src/App.tsx (jump to fork point, keep playback cursor consistent on trace switch)

### 5) Demo + Adapter evolution (multi-agent friendly fixtures)

- [ ] T021 [P] [US1] Update apps/demo/src/demo.ts to emit a multi-agent trace using multiple FlightRecorder instances sharing traceId (distinct actor ids)
- [ ] T022 [P] [US1] Add handoff events to apps/demo/src/demo.ts using recorder.handoff(...) to produce multi-agent execution trees

---

## Phase 4: User Story 2 — Visualize Differences Between Branches (Priority: P2)

**Goal**: Compute and display deterministic, lineage-aware diffs between two related traces (up to 2k steps) and make divergence discoverable in the UI.

**Independent Test**: Create sibling derived traces from the same parent, request diff, and verify the UI highlights the divergence point and changed nodes.

### 1) Tests (write first; must fail before implementation)

- [ ] T023 [P] [US2] Add diff API contract tests in apps/collector/src/server.test.ts (GET /v1/traces/:aId/diff/:bId)
- [ ] T024 [P] [US2] Add lineage-aware diff unit tests in apps/collector/src/sqliteStore.test.ts (ancestor/descendant alignment; sibling alignment; deterministic output)
- [ ] T025 [P] [US2] Add web diff mapping tests in apps/web/src/diff.test.ts (changed spanId → node highlight; divergence jump)

### 2) Diff Engine (deterministic + testable)

- [ ] T026 [US2] Implement stable event key extraction in apps/collector/src/diff/stableKey.ts (deterministic, schema-only fields)
- [ ] T027 [US2] Implement deterministic Myers sequence diff in apps/collector/src/diff/myers.ts (unit-test with synthetic sequences)
- [ ] T028 [US2] Implement lineage-aware diff composition in apps/collector/src/diff/index.ts (prefix alignment by shared fork point + suffix diff)

### 3) Collector integration (store + endpoint)

- [ ] T029 [US2] Implement `diffTraces(aId, bId)` in apps/collector/src/sqliteStore.ts using apps/collector/src/diff/index.ts and returning @afr/contracts TraceDiffResult
- [ ] T030 [US2] Add GET /v1/traces/:aId/diff/:bId endpoint in apps/collector/src/server.ts (validate response via @afr/contracts)

### 4) Web UI integration (diff visualization)

- [ ] T031 [P] [US2] Extend web API client in apps/web/src/api.ts with diff method (parse with @afr/contracts)
- [ ] T032 [US2] Add diff UI in apps/web/src/App.tsx (select compare target within lineage; render change list; jump to divergence)
- [ ] T033 [US2] Add graph highlighting for diff results in apps/web/src/graph.ts (style nodes/edges for changed spanIds deterministically)

---

## Phase 5: User Story 3 — Detect and Explain Likely Loops (Priority: P3)

**Goal**: Produce deterministic loop warnings (repeated sequences, recursive tools, multi-agent handoff cycles) and surface them in the UI.

**Independent Test**: Ingest a trace with each loop pattern and verify the analysis endpoint returns loop warnings with reasons and affected span ids; UI can navigate to the first flagged segment.

### 1) Tests (write first; must fail before implementation)

- [ ] T034 [P] [US3] Add loop analysis unit tests in apps/collector/src/analysis/loops.test.ts (repeated sequence, recursive tool, handoff cycle)
- [ ] T035 [P] [US3] Add analysis API contract tests in apps/collector/src/server.test.ts (GET /v1/traces/:traceId/analysis)
- [ ] T036 [P] [US3] Add web loop highlight mapping tests in apps/web/src/loops.test.ts

### 2) Loop analysis engine (deterministic; separate subsystem)

- [ ] T037 [US3] Implement repeated-sequence heuristic in apps/collector/src/analysis/repeatedSequence.ts (windowed stable key repeats; deterministic ordering)
- [ ] T038 [US3] Implement recursive-tool heuristic in apps/collector/src/analysis/recursiveTool.ts (tool signature normalization; thresholding)
- [ ] T039 [US3] Implement handoff-cycle heuristic in apps/collector/src/analysis/handoffCycle.ts (cycle detection over handoff edges)
- [ ] T040 [US3] Compose loop analysis output in apps/collector/src/analysis/index.ts (merge + stable sort of warnings)

### 3) Collector integration (store + endpoint)

- [ ] T041 [US3] Implement `analyzeTrace(traceId)` in apps/collector/src/sqliteStore.ts using apps/collector/src/analysis/index.ts (include failures + stats)
- [ ] T042 [US3] Add GET /v1/traces/:traceId/analysis endpoint in apps/collector/src/server.ts (validate response via @afr/contracts)

### 4) Web UI integration (loop visualization)

- [ ] T043 [P] [US3] Extend web API client in apps/web/src/api.ts with analysis method (parse with @afr/contracts)
- [ ] T044 [US3] Add loop warnings panel in apps/web/src/App.tsx (list warnings with reason/severity; jump-to-first-span)
- [ ] T045 [US3] Add graph highlighting for loop warnings in apps/web/src/graph.ts (style nodes matching warning spanIds deterministically)

---

## Phase 6: Polish & Cross-Cutting (Determinism, Edge Cases, Performance, Docs)

### Determinism + Replay Safety Regression

- [ ] T046 [P] Add regression tests for deterministic ordering helper usage in apps/web/src/graph.test.ts (ensure ordering uses @afr/contracts helper)
- [ ] T047 Add regression tests for fork prefix selection determinism in apps/collector/src/sqliteStore.test.ts (identical timestamps; out-of-order ingest; orphan events)

### Edge-case validations (explicit)

- [ ] T048 [P] Add fork error-path tests in apps/collector/src/server.test.ts (missing fork span id, partial trace fork, invalid overrides)
- [ ] T049 [P] Add lineage stress tests in apps/collector/src/sqliteStore.test.ts (many sibling branches; deterministic ordering; cycle prevention)
- [ ] T050 [P] Add diff edge-case tests in apps/collector/src/sqliteStore.test.ts (early-exit derived trace; expanded derived trace; ordering-only differences)
- [ ] T051 [P] Add loop edge-case tests in apps/collector/src/analysis/loops.test.ts (bounded retries vs runaway loops; multi-agent cycle vs repeated payload)

### Performance validation (deterministic + testable)

- [ ] T052 [P] Add lineage reconstruction performance check in apps/collector/src/sqliteStore.perf.test.ts (root+200 children; completes under a generous bound)
- [ ] T053 [P] Add diff performance check in apps/collector/src/diff/diff.perf.test.ts (2k events; completes under a generous bound)
- [ ] T054 [P] Add loop analysis performance check in apps/collector/src/analysis/analysis.perf.test.ts (2k events; completes under a generous bound)

### Docs / Demo / Smoke validation

- [ ] T055 [P] Add Phase 2 smoke script in apps/demo/src/phase2-demo.ts (emit base trace, call fork endpoint, call diff endpoint, call analysis endpoint)
- [ ] T056 [P] Update Phase 2 quickstart steps in specs/002-trace-branching/quickstart.md (fork+lineage+diff+analysis verification)
- [ ] T057 [P] Update top-level README.md with Phase 2 capabilities and local run steps (no new infra) in README.md

---

## Dependencies & Execution Order

- **Setup (Phase 1)** blocks Foundational.
- **Foundational (Phase 2)** blocks all user story work.
- **US1 (Phase 3)** must land before US2/US3 UI integration (lineage navigation is the foundation).
- **US2 and US3** can proceed in parallel after US1 store/API scaffolding exists.
- **Polish** depends on all desired user stories.

### User Story Completion Order

- US1 → US2 → US3

---

## Parallel Opportunities (examples)

### US1

- [P] tasks can run in parallel across apps/packages: T009–T011, T018, T021–T022

### US2

- [P] diff tests and web diff mapping can proceed in parallel: T023–T025

### US3

- [P] loop engine tests and web mapping can proceed in parallel: T034–T036

---

## Implementation Strategy

- Deliver Phase 2 MVP as **US1** first (fork + lineage + replay timeline improvements).
- Add **US2** diff engine + visualization next.
- Add **US3** loop analysis engine + UI last.
- Keep all changes incremental and contract-driven; avoid rewriting Phase 1 subsystems.
