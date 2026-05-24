# Tasks: AeroGraph — Phase 2 & 2.5

**Input**: Design documents from `/specs/002-trace-branching/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are REQUIRED when implementing or changing the event schema, adapters, or trace replay behavior. For other work, include tests based on the feature spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

> **Architecture Note**: Several tasks below originally referenced a modular layout (e.g. `packages/contracts/src/schema/*` or `apps/web/src/components/*`). During implementation, the schema was consolidated into `packages/contracts/src/index.ts` and React components into the flat `apps/web/src/` structure. The checkboxes correctly reflect that the feature was completed in those consolidated files.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic schema additions for Phase 2.5

- [x] T001 Initialize Phase 2.5 schemas in `packages/contracts/src/schema/index.ts`
- [x] T002 [P] Export new interfaces from `packages/contracts/src/types/index.ts`
- [x] T003 Update database migration scripts in `apps/collector/src/db/migrations.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Setup new SQLite tables (`state_snapshots`, `retriever_events`) in `apps/collector/src/db/schema.ts`
- [x] T005 [P] Update `trace_events` table in `apps/collector/src/db/schema.ts` to support `streamingTelemetry` metadata
- [x] T006 Update collector endpoints in `apps/collector/src/api.ts` to ingest the new event types

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fork a Trace and Track Lineage (Priority: P1) 🎯 MVP

**Goal**: Support trace forking and lineage tracking.

**Independent Test**: Fork execution from a chosen point and verify lineage view.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create lineage models in `packages/contracts/src/index.ts`
- [x] T008 [US1] Implement fork creation logic in `apps/collector/src/services/TraceService.ts`
- [x] T009 [US1] Build lineage graph visualization in `apps/web/src/App.tsx` and `apps/web/src/graph.ts`
- [x] T010 [P] [US1] Add lineage integration tests in `apps/collector/tests/lineage.test.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Visualize Differences Between Branches (Priority: P2)

**Goal**: Compare two related traces and see divergences.

**Independent Test**: Diff two derived traces and see structural and content differences.

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement structural diff algorithm in `packages/sdk/src/utils/diff.ts`
- [x] T012 [US2] Build diff view in `apps/web/src/App.tsx`
- [x] T013 [P] [US2] Add unit tests for diff logic in `packages/sdk/tests/diff.test.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Detect and Explain Likely Loops (Priority: P3)

**Goal**: Detect loop heuristics and warn the user.

**Independent Test**: Ingest trace with cyclic handoffs and verify warning.

### Implementation for User Story 3

- [x] T014 [P] [US3] Implement loop detection heuristics in `packages/sdk/src/utils/loops.ts`
- [x] T015 [US3] Add loop warning alerts to UI in `apps/web/src/App.tsx`

---

## Phase 6: User Story 4 - LangGraph State Tracking (Priority: P1)

**Goal**: Capture deterministic LangGraph state snapshots and diffs at node transitions.

**Independent Test**: Execute LangGraph and inspect the deterministic state snapshots.

### Implementation for User Story 4

- [x] T016 [P] [US4] Define `EventStateSnapshot` zod schema in `packages/contracts/src/index.ts`
- [x] T017 [US4] Update SDK recorder type and implement `handleChainStart`/`handleChainEnd` hooks for state capture in `packages/adapter-langchain/src/langgraph.ts` and `packages/sdk/src/index.ts`
- [x] T018 [P] [US4] Add deterministic state hasher in `packages/contracts/src/utils/hash.ts`
- [x] T019 [US4] Add state diff viewer in `apps/web/src/StateInspector.tsx`
- [x] T020 [P] [US4] Add LangGraph adapter tests in `packages/adapter-langchain/src/langgraph.test.ts`

---

## Phase 7: User Story 5 - LCEL Streaming Telemetry (Priority: P2)

**Goal**: Non-blocking capture of Time To First Token and streaming metrics.

**Independent Test**: Stream LLM output and verify TTFT/metrics without UI stutter.

### Implementation for User Story 5

- [x] T021 [P] [US5] Define `StreamingTelemetry` zod schema in `packages/contracts/src/index.ts`
- [x] T022 [US5] Implement `handleLLMNewToken` hook to track TTFT in `packages/adapter-langchain/src/streaming.ts`
- [x] T023 [US5] Add streaming metrics overlay in `apps/web/src/StreamingMetrics.tsx`
- [x] T024 [P] [US5] Add streaming unit tests in `packages/adapter-langchain/src/streaming.test.ts`

---

## Phase 8: User Story 6 - RAG Retrieval Payload Inspection (Priority: P2)

**Goal**: Capture exact retrieved documents and relevance scores.

**Independent Test**: Execute RAG and view the exact retrieved chunks in the trace.

### Implementation for User Story 6

- [x] T025 [P] [US6] Define `EventRetriever` zod schema in `packages/contracts/src/index.ts`
- [x] T026 [US6] Implement `handleRetrieverEnd` hook in `packages/adapter-langchain/src/retriever.ts`
- [x] T027 [US6] Add retriever payload view in `apps/web/src/RetrieverInspector.tsx`
- [x] T028 [P] [US6] Add retriever adapter tests in `packages/adapter-langchain/src/retriever.test.ts`

---

## Phase 9: User Story 7 - Human Checkpoint Events (Priority: P3)

**Goal**: Capture wait/interrupt states without executing resume orchestration.

**Independent Test**: Hit an interrupt and verify it is captured as a checkpoint event.

### Implementation for User Story 7

- [x] T029 [P] [US7] Define `EventCheckpoint` zod schema in `packages/contracts/src/index.ts`
- [x] T030 [US7] Implement checkpoint detection via `Interrupt` logs in `packages/adapter-langchain/src/langgraph.ts`
- [x] T031 [US7] Display wait states in UI `apps/web/src/CheckpointView.tsx`

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T032 [P] Update `README.md` and `docs/` for Phase 2.5 changes
- [x] T033 Run quickstart.md validation locally

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- All tests for a user story marked [P] can run in parallel
- Models/Schemas within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
