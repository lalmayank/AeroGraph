# Implementation Plan: AeroGraph

**Branch**: `001-agent-flight-recorder` | **Date**: 2026-05-20 | **Spec**: specs/001-agent-flight-recorder/spec.md

**Input**: Feature specification in specs/001-agent-flight-recorder/spec.md

**Note**: This plan is documentation only (no implementation changes). It is contract-first and constitution-driven.

## Summary

Build an open-source “flight recorder” for AI agent workflows by standardizing a versioned trace-event schema, ingesting and storing events in an append-only event store, and visualizing traces as an interactive graph (with payload inspection). MVP focuses on a local developer workflow: one collector service + one web UI + at least one adapter (LangChain) emitting normalized events using the shared schema.

## Technical Context

**Language/Version**: TypeScript (TS 5.x), Node.js (LTS)

**Primary Dependencies**:
- Schema/contracts: Zod
- Collector: Express + CORS
- UI: React + Vite + React Flow
- IDs: nanoid

**Storage**:
- Phase 1 (MVP target): SQLite (append-only, immutable event log; projections computed at read time)
- Current baseline in repo: JSONL append-only files per trace (used as development fallback)

**Testing**: Vitest (workspace tests; contract + adapter + replay/fork determinism)

**Target Platform**: Local dev on macOS/Windows/Linux; optional containerization later

**Project Type**: TypeScript monorepo with npm workspaces (`apps/*`, `packages/*`)

**Performance Goals**:
- Ingest: handle local bursts from instrumented workflows (order-of-magnitude: hundreds of events/sec)
- UI: render typical traces (<2k events) interactively; keep payload inspection snappy

**Constraints**:
- Schema-as-truth (no ad-hoc event fields)
- Replay-safe: stored traces preserve referential integrity and ordering semantics
- Strict package boundaries: contracts are the only cross-layer interface surface
- Phase 1 avoids heavy infrastructure (no distributed runtimes)

**Scale/Scope**:
- Phase 1: single-user local developer workflow
- Phase 2+: foundation for multi-trace comparison, streaming, and OTel alignment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Event schema is the source of truth (schema drives contracts/types/storage/UI).
- No UI logic bypasses shared contracts.
- Adapters emit normalized trace events with a deterministic mapping.
- Implementation preserves trace replayability (no silent data loss).
- Tests are included and required for schema, adapters, and replay behavior.
- Unclear requirements are marked NEEDS CLARIFICATION (do not invent APIs).

Status: PASS (plan keeps contracts central, limits cross-coupling, and treats schema evolution as gated).

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-flight-recorder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md            # Produced by /speckit.tasks (not part of this command)
```

### Source Code (repository root)

```text
apps/
├── collector/          # ingest + validation + storage + analysis
├── web/                # trace graph UI
└── demo/               # demo emitter for local smoke tests

packages/
├── contracts/          # canonical event schema + API shapes
└── sdk/                # normalized emitter helpers; adapters build on this
```

**Structure Decision**: Keep a small number of packages in Phase 1. Contracts are the sole canonical interface between apps and packages. Add adapter packages only when a framework integration needs distinct dependencies/release cadence.

## Package Boundary & Dependency Graph

Allowed dependencies (Phase 1):

```text
@afr/contracts
  ↑
@afr/sdk
  ↑           ↑
apps/demo   apps/collector
               ↑
            apps/web
```

Rules:
- `packages/contracts` must not import from any other workspace package.
- `apps/web` must not define its own schema copies; it consumes `@afr/contracts`.
- `apps/collector` is the only runtime that persists traces; all other apps are stateless consumers.
- Any adapter package (e.g., LangChain) depends on `@afr/sdk` + `@afr/contracts`, not on collector/web.

## Architecture

### Event-Sourcing Shape (Local MVP)

- **Source of truth**: an append-only sequence of `TraceEvent` records.
- **Read models**: computed views (graph edges, loop/failure highlights, meta summaries) derived from events.
- **Determinism contract**: given the same event log, derived views are stable.

### Replay Determinism Guarantees

Phase 1 guarantees (local, single process):
- Events are stored immutably (append-only).
- Parent/child relationships are preserved via `spanId`/`parentSpanId`.
- Forking creates a new trace by copying a prefix of events and rewriting IDs deterministically.

Phase 2/3 evolution (when scaling pressure exists):
- Introduce a stable, explicit ordering key for ties (e.g., `ingestSeq`) if needed; any such key must be added to the schema (Principle I).

### Collector Responsibilities

- Validate incoming events with `@afr/contracts`.
- Persist events append-only.
- Serve trace retrieval + analysis endpoints.
- Provide replay-safe fork/derive operations (data-level replay) without mutating originals.
- Provide diff/compare views as pure functions of event logs.
- Phase 1 “realtime”: keep minimal (SSE or polling); no distributed streaming.

### UI Responsibilities

- Fetch trace list and a selected trace.
- Convert events into a graph (nodes = events; edges = parent/links).
- Display payloads and highlights (failures, loop segments).
- Phase 1: playback = deterministic traversal/step-through of event order (no execution runtime).

### Adapter Responsibilities (LangChain in Phase 1)

- Deterministically map framework-native callbacks/spans into `TraceEvent` records.
- Preserve replay-relevant semantics in schema-approved payload fields.
- Emit only normalized schema events (no framework-specific fields at top-level).

## Phased Rollout Strategy (CRITICAL)

### Phase 1 (MVP)

Goal: minimal end-to-end vertical slice (emit → ingest → store → visualize → playback).

Scope:
- Collector: Express service with SQLite persistence.
- Storage: append-only SQLite tables for events; projections computed at read time.
- Adapter: LangChain adapter emitting normalized events via `@afr/sdk`.
- UI: React Flow visualization + payload inspector + basic playback (step through events).

Explicit non-goals:
- No distributed systems, no heavy infra.
- No “true” execution replay engine.
- No OpenTelemetry collector pipelines.

Exit criteria:
- Schema and shared contracts are used end-to-end.
- A representative LangChain workflow produces a trace that renders correctly.
- Tests cover schema validity, adapter normalization, and replay/fork integrity.

### Phase 2 (v1)

Goal: broaden ecosystem + tighten determinism.

Scope:
- OpenTelemetry alignment: accept/translate OTel span data into schema (without requiring full OTel infra for all users).
- Add adapters (AutoGen / CrewAI).
- Improve replay engine semantics (still “reconstructive” unless full execution is safe/available).
- Better persistence abstraction (pluggable stores; indexes; migrations).
- Improve diff/compare fidelity (span-aware alignment).

### Phase 3 (Scale)

Goal: scalability and long-term governance.

Scope:
- Collector architecture: ingestion pipeline, backpressure, streaming fan-out.
- Deterministic replay systems (explicit ordering keys, stable projections).
- Advanced indexing and search.
- Distributed infra only if justified by validated needs.

## Testing Strategy

Minimum required suites (Principle V):
- `packages/contracts`: schema tests (round-trip parsing, invariants, versioning expectations).
- Adapter packages: golden fixture tests (given source events → exact normalized events).
- Collector: store tests for immutability, ordering, fork integrity, loop/failure analysis stability.
- UI: at least a smoke-level rendering test on a fixture trace (Phase 1: optional if toolchain cost is high; prefer lightweight fixtures).

CI expectations:
- `npm test` must run schema + adapter + replay tests.
- Any schema change requires explicit compatibility notes + tests.

## Deployment Strategy

Phase 1:
- Local dev: run collector + web independently.
- Persistence: local SQLite file (path configurable via env).

Phase 2+:
- Optional Docker compose for collector + UI.
- Prepare for hosted mode (auth is out of scope until requested).

## Schema Governance

- `traceEventSchemaVersion` is bumped for any contract-impacting change.
- Prefer additive changes; breaking changes require migration/compatibility plan.
- Schema changes require cross-layer review (backend + UI + adapters) and tests.

## Post-Design Constitution Re-check

After Phase 1 design artifacts (research/data-model/contracts/quickstart): PASS.

No constitution violations are required for this plan.
