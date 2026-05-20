# Data Model — Agent Flight Recorder

This describes the domain entities and the Phase 1 persistence model.

## Core Entities

### TraceEvent (immutable)

Source of truth: `packages/contracts` (`TraceEvent`).

Key fields:
- `schemaVersion`: version pin for schema evolution
- `traceId`: groups events into a single trace/run
- `spanId`: unique identifier within a trace
- `parentSpanId`: adjacency for hierarchy
- `occurredAt`: RFC3339 timestamp
- `actor`: `{ kind: agent|tool|system, id, name? }`
- `kind`: `prompt|response|tool_call|tool_result|handoff|error|note`
- `status`: `ok|error`
- `payload`: kind-specific structured payload
- `links`: explicit cross-links (`follows`, `caused_by`, `handoff_to`)

Validation rules (from constitution + schema intent):
- Event top-level fields never include ad-hoc keys.
- Actor kinds are structurally constrained per event kind.
- Events are treated as immutable once accepted.

### TraceMeta (derived)

Source of truth: `packages/contracts` (`TraceMeta`).

Derived fields:
- `createdAt`: earliest event timestamp
- `updatedAt`: latest event timestamp
- `eventCount`: count of events
- `rootSpanId`: first root-span by timestamp (or null)
- `derivedFrom?`: for forked traces

### TraceWithMeta (materialized response)

Source of truth: `packages/contracts` (`TraceWithMeta`).

Relationship:
- `TraceWithMeta.meta.traceId` matches all `events[].traceId`.

### TraceAnalysis (derived)

Source of truth: `packages/contracts` (`TraceAnalysis`).

Contains:
- `failures`: spans where `status=error`
- `loops`: heuristic loop segments
- `stats`: aggregate counts

## Phase 1 Persistence Model (SQLite)

Goal: append-only immutable event store with derived read models.

### Tables (proposed)

1) `events` (append-only)

- `id INTEGER PRIMARY KEY AUTOINCREMENT` (ingestion order; *not* part of event schema)
- `trace_id TEXT NOT NULL`
- `span_id TEXT NOT NULL`
- `parent_span_id TEXT NULL`
- `occurred_at TEXT NOT NULL`
- `actor_kind TEXT NOT NULL`
- `actor_id TEXT NOT NULL`
- `kind TEXT NOT NULL`
- `status TEXT NOT NULL`
- `title TEXT NULL`
- `event_json TEXT NOT NULL` (canonical JSON for the full event; validated by contracts)

Constraints / indexes:
- `UNIQUE(trace_id, span_id)` to prevent accidental duplication
- Indexes on `(trace_id, occurred_at)` and `(trace_id, id)`

2) `traces` (optional cache/projection)

For MVP, trace meta can be computed on read; optionally cache:
- `trace_id TEXT PRIMARY KEY`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `event_count INTEGER NOT NULL`
- `root_span_id TEXT NULL`
- `derived_from_json TEXT NULL`

Note: If `traces` is used, treat it as a derived projection (updates are allowed) while keeping `events` append-only.

## State & Transitions

- Trace state is implicit via events. A trace “exists” once at least one event is ingested.
- A derived/forked trace is created by copying a prefix of base events, rewriting span IDs, and adding a system `note` describing derivation.

## Replay Determinism (Data Model Implications)

- Deterministic traversal is based on `occurredAt`, with tie-break by ingestion order (`events.id`) when timestamps collide.
- Any future requirement for global determinism across distributed collectors must be solved via schema-governed ordering keys (Phase 2+).
