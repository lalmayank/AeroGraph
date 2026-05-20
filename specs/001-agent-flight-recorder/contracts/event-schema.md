# Contract: Trace Event Schema

Source of truth: `packages/contracts` (`traceEventSchema`, `TraceEvent`).

## Goals

- Single canonical definition of a "trace event" used by adapters, collector, and UI.
- Replay-safe trace reconstruction (hierarchy + ordering + cross-links).

## Invariants

- The schema is versioned (`schemaVersion`). Any change is a contract change.
- No component may emit or persist ad-hoc top-level fields outside the schema.
- Actor kind is normalized and structurally constrained by event kind:
  - `prompt`, `response` → `actor.kind = agent`
  - `tool_call`, `tool_result` → `actor.kind = tool`
  - `handoff` → `actor.kind = system`

## Relationship semantics

- `spanId` uniquely identifies an event within a trace.
- `parentSpanId` defines the primary hierarchy for graph edges.
- `links[]` defines additional causal/follow edges.

## Replayability guarantees (data-level)

- Given the same event log for a trace, the graph derivation and playback order must be deterministic.
- Forking produces a derived trace linked to the base trace via trace metadata and a system note event.

## Compatibility with OpenTelemetry

- Field semantics align with OTel concepts (trace/span IDs and parent relationships).
- Phase 1 avoids introducing OTel collector/exporter infrastructure; Phase 2 may add ingestion/translation.
