# Data Model: Feature 003 — Python SDK & Multi-Language Contract Support

This feature does not introduce new persisted entities in the collector. It introduces new *producers* (Python SDK + Python adapters) and new *governance artifacts* (JSON Schema + generated Python models) that must remain consistent with the canonical TypeScript contracts.

## Canonical Domain Entities (unchanged)

### TraceEvent (canonical)

- Source of truth: `@aerograph/contracts` (`traceEventSchema`, `TraceEvent`)
- Identity & relationships:
  - `traceId`: groups events into a trace
  - `spanId`: identifies a node/span
  - `parentSpanId`: establishes a tree/DAG relationship
  - `links[]`: additional relationships (`follows`, `caused_by`, `handoff_to`)
- Ordering:
  - deterministic comparison: `occurredAt` → `spanId` → `kind`
- Kinds (current): `prompt`, `response`, `tool_call`, `tool_result`, `handoff`, `error`, `note`, `state_snapshot`, `retriever`, `checkpoint`

### Trace / TraceMeta / TraceWithMeta (canonical)

- Source of truth: `@aerograph/contracts` (`traceSchema`, `traceMetaSchema`, `traceWithMetaSchema`)
- Storage invariant: append-only event table; trace views are derived.

## Governance Artifacts (new)

### Exported JSON Schema (derived artifact)

- Produced by: `packages/schema-exporter`
- Inputs: canonical Zod schemas from `@aerograph/contracts`
- Outputs (versioned by `schemaVersion`):
  - JSON Schema for `TraceEvent` (discriminated union on `kind`)
  - JSON Schema for `Trace`, `TraceMeta`, `TraceWithMeta`, and key API payloads used by clients
- Purpose:
  - enable code generation and/or validation in non-TypeScript runtimes
  - provide a drift-detection surface for CI

### Generated Python contract models (derived artifact)

- Generated from: exported JSON Schema
- Output form: Pydantic v2 model code, committed in the Python packages
- Purpose:
  - local validation in Python SDK + adapters
  - type-safe construction of events

## Python SDK Entities (new runtime producer)

### PythonFlightRecorder (library object)

- Responsibility: construct schema-valid TraceEvents and emit them to the collector.
- State:
  - `endpoint` (collector base URL)
  - `trace_id` (default generated; can be provided)
  - `actor` (agent identity: `{id, name?}`)
- Behavior:
  - inject `schemaVersion`
  - generate `spanId` and `traceId` helpers
  - support sync + async clients
  - batch emission via `POST /v1/events` with an array body

### DeterministicStateHash (pure function)

- Input: JSON-compatible mapping (typically the LangGraph/LangChain state snapshot)
- Output: `stateHash` string
- Contract: MUST match `@aerograph/contracts:getDeterministicStateHash` byte-for-byte.

## Python Adapter Entities (new runtime producer)

### LangChainCallbackAdapter

- Responsibility: map LangChain callback lifecycle events into normalized `TraceEvent` emissions using the Python SDK.
- Key mapping concepts:
  - stable `spanId` derivation from LangChain `run_id` with a deterministic encoding
  - `parentSpanId` derived from LangChain parent run relationships
  - prompt/response/tool/retriever events mapped into canonical kinds
  - optional state snapshot/checkpoint events when LangGraph and/or checkpoint hooks are available via the LangChain integration surface

## Relationships & Invariants

- Canonicality: Zod contracts are canonical; JSON Schema and Python models are derived and must not diverge.
- Replay safety: adapters must not mutate history; they only emit new append-only events.
- Determinism:
  - ordering comparator must be followed where ordering is required
  - hashing must match across runtimes
