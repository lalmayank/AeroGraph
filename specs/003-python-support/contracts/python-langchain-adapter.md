# Python LangChain Adapter Contract (Feature 003)

## Package

- PyPI: `aerograph-langchain`
- Import: `aerograph_langchain` (recommended module name)

## Scope

- Implement LangChain (Python) adapter.
- Provide LangGraph support **only via** LangChain integration surfaces.
- Do not implement CrewAI or AutoGen adapters in Feature 003 (architecture-only notes may exist in tasks later).

## Adapter shape

### Primary integration surface

Implement a LangChain callback handler that emits canonical TraceEvents through the Python SDK.

- Must be attachable via LangChain’s standard callback mechanisms.
- Must not require users to manually emit events for common workflows.

### Event mapping requirements

The adapter MUST emit the following event kinds when the underlying signals exist:

- `prompt` / `response`
- `tool_call` / `tool_result`
- `retriever`
- `error`
- `note` (for auxiliary metadata that does not map to first-class fields)
- `state_snapshot` (when state transitions are available via LangGraph/LangChain integration)
- `checkpoint` (when checkpoint events are available)

### Span identity and parent/child

- Each LangChain run corresponds to one or more spans.
- The adapter MUST derive `spanId` deterministically from the framework run identifier.
  - Recommendation: `spanId = "s_" + <run_id_string>` or a stable encoding thereof.
- `parentSpanId` must be derived from the framework’s parent run relationship.

### Determinism

- Mapping must be deterministic for a given callback sequence.
- Ordering must be stable even when timestamps collide; if the adapter buffers, apply the same comparator as contracts.

### Streaming telemetry

- When token streaming data is available, emit schema-compliant streaming telemetry.
- If full telemetry is not available, omit optional fields rather than inventing values.

### Retrieval payloads

- Emit retrieval query + documents + metadata using the canonical `retriever` event payload.
- Large documents must be truncated deterministically if size limits are required.

### Replay safety

- Adapter MUST not mutate previously emitted events.
- Any additional context discovered later must be emitted as new append-only events (e.g., `note` or `error`) linked by span relationships.

## Error handling

- Adapter must emit `error` events when the framework reports errors.
- Adapter must not swallow errors; it should re-raise after emitting unless the framework callback contract forbids it.

## Compatibility constraints

- Must target a pinned set of LangChain versions.
- Must avoid relying on private LangChain APIs that change frequently.
