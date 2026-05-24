# Replay & Playback Model

The primary value of the AeroGraph is the ability to predictably replay, fork, and inspect past executions.

## Append-Only Foundation (ADR-0004)
Trace events are never modified. An update to an entity (e.g., an agent failing) is modeled as a new `error` event appended to the log, linking back to the original span. This append-only design provides a mathematically sound, time-ordered ledger.

## Deterministic Playback
Because the log is immutable, the web UI can confidently "step through" a trace.
1. The UI sorts events by `occurredAt` (using SQLite row IDs as a tie-breaker).
2. Stepping forward applies the next event's state to the UI projection.
3. This creates a visually deterministic "playback" of the execution without needing to run the underlying LLMs or scripts again.

## Forking and Derivation
When a user wants to test an alternate prompt or input:
1. They select a node in the UI as a fork point.
2. The collector copies the prefix of events up to that node into a new `traceId`.
3. It rewrites `spanId`s deterministically.
4. It appends a `note` event documenting the fork lineage (`derivedFrom`).
5. The new trace can now accept new, divergent events without polluting the original run.
