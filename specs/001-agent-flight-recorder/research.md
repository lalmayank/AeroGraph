# Research & Decisions — Agent Flight Recorder

This document captures Phase 0 decisions needed to produce a concrete implementation plan.

## Decision: Contract-first schema (Zod) as canonical interface

- **Decision**: Use `packages/contracts` (Zod) as the source of truth for event schema and API payload shapes.
- **Rationale**: Enforces Constitution Principles I–II (schema-as-truth, no bypasses) and keeps UI/collector/adapters consistent.
- **Alternatives considered**:
  - OpenAPI-first contracts → adds tooling overhead and duplicates type system.
  - UI-defined types → violates constitution and creates drift.

## Decision: OpenTelemetry compatibility (semantic alignment, not infra)

- **Decision**: Keep IDs and relationships aligned with OTel concepts:
  - `traceId` (OTel trace id semantics)
  - `spanId` / `parentSpanId` (span relationships)
  - `occurredAt` (timestamp)
  Without adopting OTel collectors/exporters in Phase 1.
- **Rationale**: Preserves an upgrade path to OTel ingestion/interop in Phase 2 while staying lightweight.
- **Alternatives considered**:
  - Full OTel pipeline in MVP → too heavy (violates Phase 1 constraint).

## Decision: Phase 1 persistence = SQLite append-only event log

- **Decision**: Persist trace events to SQLite using an **append-only** events table; compute projections (trace meta, graph edges, analysis) from the event log.
- **Rationale**: SQLite is a strong MVP datastore (portable, easy dev setup) and still matches event-sourcing goals.
- **Alternatives considered**:
  - JSONL-only → simple, but indexing/query evolution is harder.
  - Postgres → overkill for MVP.

## Decision: Immutability & ordering semantics

- **Decision**:
  - Treat events as immutable once ingested.
  - Ordering for UI playback and derived views is deterministic:
    1) sort by `occurredAt`
    2) tie-break by ingestion order within a single collector process
- **Rationale**: Ensures stable replay/graph generation in MVP.
- **Alternatives considered**:
  - Add `ingestSeq` to schema immediately → would be a schema change; defer until real need is demonstrated.

## Decision: Realtime trace “streaming” in Phase 1

- **Decision**: Phase 1 supports near-realtime updates with minimal complexity:
  - preferred: Server-Sent Events (SSE) from collector for a selected trace
  - fallback: short-interval polling
- **Rationale**: SSE keeps the stack simple (HTTP-only) and avoids distributed systems.
- **Alternatives considered**:
  - WebSockets → more moving parts for MVP.
  - Message buses → not Phase 1.

## Decision: Adapter packaging strategy

- **Decision**: Keep `packages/sdk` as the generic normalized emitter foundation. Add a dedicated adapter package when a framework requires non-trivial dependencies.
- **Rationale**: Avoid unnecessary package extraction, but preserve modular adapters (constitution + architecture constraints).
- **Alternatives considered**:
  - Put all adapter logic into collector → violates boundary and reusability.

## Decision: Diffing and loop detection

- **Decision**:
  - Phase 1 diffing can start with deterministic baseline alignment; evolve to span-aware alignment in Phase 2.
  - Loop detection uses stable-key window heuristics for MVP; evolve to more robust algorithms later.
- **Rationale**: Keeps MVP simple while providing immediate utility.
- **Alternatives considered**:
  - Full graph edit distance / advanced sequence alignment → too heavy for Phase 1.
