# ADR 0004: Append-Only Trace Storage

## Context
Traces in multi-agent workflows represent historical records of execution. Agents may execute asynchronously, fail, or be interrupted. To accurately replay or debug these systems, the exact sequence of events must be preserved immutably. Mutating historical events destroys the integrity of the trace and makes deterministic playback impossible.

## Decision
All trace storage will be strictly append-only. Once a `TraceEvent` is successfully ingested and validated, it becomes immutable. Updates to existing events (e.g., marking a span as "failed" after the fact) must be implemented by appending new events (e.g., an `error` event linked to the span) rather than mutating the original row.

## Rationale
Append-only architecture guarantees that the trace is a mathematically sound ledger of execution. This eliminates race conditions during ingestion (we never UPDATE, only INSERT). It allows the UI and analysis engines to derive views (like trace status, loop detection, and failure highlights) deterministically as pure functions of the event log. Most importantly, it guarantees replay safety: a trace can be reliably forked or stepped through because historical context is never overwritten.

## Tradeoffs
- **Pros:** Perfect audit trail, no write-write conflicts, enables event-sourcing architectural patterns, guarantees deterministic reconstructive playback.
- **Cons:** Increased storage size (though negligible for text data), requires read-side projections to compute the "current state" of a trace, making queries slightly more complex than simple CRUD reads.

## Rejected Alternatives
- **CRUD Spans (Update-in-place):** Storing a `Span` row and updating its `status` or `endTime` when new information arrives. Rejected because it destroys intermediate state, complicates concurrency, and makes it impossible to know *when* a state change occurred relative to other events.
- **Event Sourcing with Snapshots:** Implementing full CQRS with materialized views. Rejected as premature optimization for Phase 1. Deriving state on read is fast enough for typical local trace sizes (<10k events).

## Migration Expectations for Phase 2/3
In Phase 2/3, as trace volumes grow, deriving complex analysis (like loop detection) on every read will become a bottleneck. We will introduce asynchronous read-model projections (materialized views) that update in the background while keeping the core event table append-only. We may also introduce TTLs or archival strategies for old traces.
