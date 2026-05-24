# Tasks: AeroGraph — Phase 1 (MVP)

**Scope Guard (CRITICAL)**: This task list is **Phase 1 only**. Do **not** implement Phase 2/Phase 3 items (OpenTelemetry pipelines, advanced replay engines, distributed event sourcing, queues, microservices, Kubernetes, scalable infrastructure).

**Input**: Design documents in `specs/001-agent-flight-recorder/` (`spec.md`, `plan.md`, plus optional docs).

**Constitution Gates (must hold throughout)**
- Event schema is the source of truth.
- No UI or backend logic bypasses shared contracts.
- Adapters emit normalized events deterministically.
- Replay safety: immutable storage, preserved relationships, deterministic reconstruction.
- Tests are mandatory for schema, adapters, and replay/persistence behavior.

## Phase 1: Setup (Monorepo Setup + Local Developer Experience)

- [x] T001 Create adapter workspace skeleton in packages/adapter-langchain/package.json, packages/adapter-langchain/tsconfig.json, packages/adapter-langchain/src/index.ts
- [x] T002 Update root workspace scripts to include the new adapter package build/test ordering in package.json (ensure `npm test` builds contracts/sdk/adapter first)
- [x] T003 [P] Add local env documentation and defaults in apps/collector/README.md and apps/collector/.env.example (PORT, AFR_DB_PATH)
- [x] T004 [P] Update top-level usage docs for Phase 1 MVP in README.md (collector + web + langchain adapter demo)

---

## Phase 2: Foundational (Contracts + SDK)

### Contracts (shared schema-as-truth)

- [x] T005 Add/confirm schema invariants tests in packages/contracts/src/index.test.ts (actor.kind constraints per event kind; schemaVersion pin)
- [x] T006 [P] Add/confirm contract tests for API payload shapes in packages/contracts/src/index.test.ts (TraceMeta, TraceWithMeta, TraceListResponse)

### SDK (normalized emitter helpers)

- [x] T007 [P] Add/confirm SDK normalization tests in packages/sdk/src/index.test.ts (prompt/response/tool_call/tool_result/error all parse via @afr/contracts)
- [x] T008 [P] Document SDK emitter usage for adapters in packages/sdk/README.md (how to pass traceId/spanId/parentSpanId deterministically)

**Checkpoint**: Contracts + SDK are stable; app work can begin.

---

## Phase 3: User Story 1 — Capture & Inspect a Trace (Priority: P1) 🎯 MVP

**Goal**: Ingest a trace, persist it append-only in SQLite, and render it as an interactive graph with payload inspection, failure highlighting, simple playback, and basic realtime updates.

**Independent Test**: Run a minimal LangChain workflow that emits normalized events; verify collector persists them; open web UI and confirm graph renders, payload inspection works, failures highlight, playback steps deterministically, and the UI updates as new events arrive.

### 1) Testing (write first; must fail before implementation)

- [x] T009 [P] [US1] Add collector API contract tests in apps/collector/src/server.test.ts (POST /v1/events validates; GET /v1/traces returns TraceListResponse; GET /v1/traces/:id returns TraceWithMeta)
- [x] T010 [P] [US1] Add SQLite store unit tests in apps/collector/src/sqliteStore.test.ts (append-only guarantees; ordering tie-break; unique spanId per traceId)
- [x] T011 [P] [US1] Add adapter golden tests in packages/adapter-langchain/src/handler.test.ts (simulated callbacks → deterministic normalized events)
- [x] T012 [P] [US1] Add web pure-function tests for graph/playback derivation in apps/web/src/graph.test.ts (buildGraph/playback ordering on fixtures)

### 2) Collector (simple Express collector)

- [x] T013 [US1] Add test dependencies for API tests in apps/collector/package.json (supertest + types) and wire vitest config if needed
- [x] T014 [US1] Refactor apps/collector/src/server.ts to export the Express `app` for tests while keeping the production `listen()` behavior
- [x] T015 [US1] Ensure ingestion remains schema-driven by validating input exclusively via @afr/contracts in apps/collector/src/server.ts

### 3) Local Persistence (SQLite; append-only immutable trace storage)

- [x] T016 [US1] Add SQLite driver dependency and wiring in apps/collector/package.json (choose one driver; document rationale in apps/collector/README.md)
- [x] T017 [US1] Implement SQLite DB initialization/migrations in apps/collector/src/sqlite/db.ts and apps/collector/src/sqlite/migrate.ts (create `events` table append-only + indexes)
- [x] T018 [US1] Implement SqliteTraceStore in apps/collector/src/sqliteStore.ts (appendEvent/listTraces/getTrace only) using SQLite as the source of truth
- [x] T019 [US1] Wire apps/collector/src/server.ts to instantiate SqliteTraceStore using `AFR_DB_PATH` (default under apps/collector/data/)
- [x] T020 [US1] Preserve replay safety: enforce `UNIQUE(trace_id, span_id)` and forbid updates/deletes of stored events in apps/collector/src/sqliteStore.ts

### 4) Adapter — LangChain (minimal; deterministic mapping)

- [x] T021 [US1] Create adapter package metadata in packages/adapter-langchain/package.json (name @afr/adapter-langchain, deps on @afr/sdk + @afr/contracts, pin LangChain JS dependency)
- [x] T022 [P] [US1] Define deterministic mapping doc in packages/adapter-langchain/README.md (which LangChain callbacks map to prompt/response/tool_call/tool_result/error)
- [x] T023 [US1] Implement LangChain callback handler in packages/adapter-langchain/src/handler.ts (emits normalized events via FlightRecorder; no framework-specific top-level fields)
- [x] T024 [US1] Export adapter API from packages/adapter-langchain/src/index.ts (minimal surface: `createLangChainHandler({ recorder, ... })`)

### 5) Web Visualization (React Flow graph + payload inspection)

- [x] T025 [US1] Keep UI contract-driven: ensure apps/web/src/api.ts parses responses via @afr/contracts schemas (TraceListResponse, TraceWithMeta, TraceAnalysis)
- [x] T026 [US1] Ensure failure highlighting uses event.status only (schema field) in apps/web/src/App.tsx

### 6) Basic Realtime Updates (MVP; no new infra)

- [x] T027 [US1] Implement trace auto-refresh in apps/web/src/App.tsx using polling (refresh selected trace + analysis every N seconds; cleanup on traceId change)
- [x] T028 [US1] Add a minimal UI indicator in apps/web/src/App.tsx for “Live updating” state (polling on/off)

### 7) Simple Trace Playback (reconstruction only)

- [x] T029 [US1] Implement deterministic playback ordering helper in apps/web/src/graph.ts (timestamp ordering + stable tie-break; no execution)
- [x] T030 [US1] Add playback controls in apps/web/src/App.tsx (step next/prev; optional play/pause) and highlight the active node in the graph

### 8) Local Developer Experience (docs + smoke)

- [x] T031 [P] [US1] Add a LangChain-powered smoke script in apps/demo/src/langchain-demo.ts demonstrating the adapter end-to-end (emits to collector)
- [x] T032 [P] [US1] Update specs/001-agent-flight-recorder/quickstart.md to include the LangChain demo flow and expected UI behavior

---

## Phase 4: Polish & Cross-Cutting Concerns (Phase 1 only)

- [x] T033 [P] Run and document a Phase 1 smoke checklist in specs/001-agent-flight-recorder/quickstart.md (collector + web + demo + expected highlights)
- [x] T034 [P] Verify package boundaries stay intact (no imports across apps except via @afr/contracts/@afr/sdk) by reviewing imports in apps/*/src and packages/*/src

---

## Dependencies & Execution Order

- Phase 1 (Setup) blocks Phase 2 and Phase 3.
- Phase 2 (Foundational) blocks Phase 3.
- Phase 3 (US1) can be parallelized by workstream once tests (T009–T012) exist:
  - Collector + SQLite work (T013–T020)
  - LangChain adapter (T021–T024)
  - Web realtime + playback (T025–T030)
  - DX docs + demo (T031–T034)

## Parallel Opportunities (examples)

- Contracts/SDK tests/docs can run in parallel: T005–T008.
- US1 tests can run in parallel across packages/apps: T009–T012.
- Adapter implementation can proceed in parallel with collector persistence: T021–T024 and T016–T020.
- Web playback/realtime can proceed in parallel with collector work: T027–T030.

## MVP Scope

Phase 1 MVP corresponds to **User Story 1 only**. User Stories 2–3 (fork/diff, loop detection) are intentionally excluded from this Phase 1 task list.
