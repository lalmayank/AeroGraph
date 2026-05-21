# Data Model: Phase 2 — Lineage, Diff, Loop Analysis

This data model is conceptual and contract-driven. Storage and APIs must derive from `@afr/contracts`.

## Entities

### Trace

Represents a single recorded execution.

Key fields:
- `traceId`: unique identifier
- `createdAt`, `updatedAt`
- `rootSpanId` (nullable)
- `eventCount`

Relationships:
- has many `TraceEvent`
- may have zero or one `TraceDerivation` (if derived)
- may have many child traces via `TraceDerivation`

### TraceEvent

An append-only, normalized event (prompt/response/tool/handoff/error/note).

Key fields:
- `traceId`, `spanId`, `parentSpanId`
- `occurredAt`
- `kind`, `status`
- `actor`
- `payload`
- `links[]`

### TraceDerivation

Represents the lineage relationship (append-only, acyclic).

Key fields:
- `childTraceId`
- `parentTraceId`
- `forkedFromSpanId` (span in parent trace)
- `createdAt`
- `overrides` (opaque JSON, contract-governed)

Invariants:
- each `childTraceId` has exactly one derivation
- lineage graph is acyclic
- parent trace is never mutated

### LineageGraph

A navigable view over related traces.

Key fields:
- `rootTraceId`
- `nodes[]`: trace metadata nodes
- `edges[]`: derivation edges

### DiffResult

A deterministic comparison artifact between two lineage-related traces.

Key fields:
- `a`, `b`: trace metadata
- `divergence`: identifies first divergence point (if any)
- `changes[]`: stable list of change hunks or per-step changes

### LoopWarning

A deterministic diagnostic artifact.

Key fields:
- `kind`: repeated_sequence | recursive_tool | handoff_cycle
- `severity`: low | medium | high
- `reason`: human-readable explanation
- `spanIds[]`: affected event set

## SQLite Projection (Conceptual)

- `events` (append-only): stores `TraceEvent` JSON plus minimal columns for indexing.
- `traces` (append-only rows per trace): stores trace-level meta snapshots derived from events.
- `trace_derivations` (append-only): stores lineage edges.

Note: tables may be extended additively via migrations; historical event rows remain immutable.
