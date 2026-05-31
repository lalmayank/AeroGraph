# Python SDK API Contract (Feature 003)

## Package

- PyPI: `aerograph-sdk`
- Import: `aerograph_sdk` (recommended module name)

## Goals

- Emit TraceEvents identical in shape and semantics to `@aerograph/sdk`.
- Provide sync + async clients.
- Provide batching.
- Provide local validation against generated Pydantic models.
- Provide deterministic defaults (timestamps, ordering rules when batching).

## Core Concepts

### FlightRecorder

A `FlightRecorder` instance is scoped to:

- `endpoint`: collector base URL
- `trace_id`: optional; auto-generated when absent
- `actor`: agent identity

Required constructor fields:

- `endpoint: str`
- `actor: { id: str, name: str | None }`

Optional constructor fields:

- `trace_id: str | None`
- `http_client`: injection point for testing

### ID helpers

- `new_trace_id() -> str` returns `t_...`
- `new_span_id() -> str` returns `s_...`

### Emission

- `emit(event: TraceEvent) -> TraceEvent` (sync)
- `emit_async(event: TraceEvent) -> TraceEvent` (async)
- `emit_batch(events: list[TraceEvent])` (sync)
- `emit_batch_async(events: list[TraceEvent])` (async)

Rules:

- SDK injects `schemaVersion` for all emitted events.
- SDK validates events locally before sending.
- SDK uses `POST /v1/events` and supports sending either a single event or an array (batch).
- SDK sets `content-type: application/json`.
- Non-2xx responses raise an exception that includes status code and response text.

### Convenience methods

Mirror the TypeScript SDK entrypoints (names can be Pythonic but semantics must match):

- `prompt(...)`
- `response(...)`
- `tool_call(...)`
- `tool_result(...)`
- `handoff(...)`
- `error(...)`
- `note(...)`
- `state_snapshot(...)`
- `retriever(...)`
- `checkpoint(...)`

Each helper must:

- generate a `spanId` if missing
- accept `parentSpanId` (nullable)
- default `occurredAt` to current UTC time (RFC 3339)
- enforce actor `kind` requirements for each event kind

### Deterministic ordering

If the SDK buffers events (batch mode), it MUST preserve deterministic ordering:

- primary: `occurredAt` (lexicographic)
- secondary: `spanId`
- tertiary: `kind`

This matches `@aerograph/contracts:compareTraceEvents`.

### Hashing helpers

- `get_deterministic_state_hash(state: Mapping[str, Any]) -> str`

Contract:

- MUST match `@aerograph/contracts:getDeterministicStateHash` byte-for-byte.

## Non-goals

- No local persistence.
- No execution orchestration.
- No runtime resume engines.
