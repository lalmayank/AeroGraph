# Feature Specification: First-Class Python Support

**Feature Branch**: `003-python-sdk`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "We are adding first-class Python support to AeroGraph. This feature must extend the existing architecture without breaking any Phase 1, Phase 2, or Phase 2.5 guarantees. Goals: (1) Python SDK equivalent to @aerograph/sdk with sync+async, batching, context-manager tracing, deterministic ordering; (2) cross-language contract governance via language-neutral schemas (export JSON Schema from Zod; generate Python models); (3) Python LangChain adapter equivalent to the TS adapter including streaming, retriever payloads, LangGraph state tracking, checkpoints; (4) future-ready adapter extension points for other Python frameworks (LangGraph, AutoGen, CrewAI, PydanticAI, OpenAI Agents SDK) but only implement LangChain Python in Phase 3; (5) cross-language deterministic hashing requirements; (6) testing/CI design and schema drift detection; (7) documentation design. Constraints: do not redesign collector/contracts, add distributed systems, add orchestration, or implement replay execution."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Python Developers Can Record Traces (Priority: P1)

As a Python AI developer, I want to emit AeroGraph trace events from my Python application and view them in the existing collector + web UI, so I can debug agent workflows without switching languages or tooling.

**Why this priority**: This is the minimal “first-class Python” outcome: Python users can participate in the exact same trace/graph/debug workflow as TypeScript users.

**Independent Test**: Run the collector and web UI, run a small Python script that emits a representative set of events, then confirm the trace is stored, retrievable by trace ID, and renders correctly in the UI with payload inspection and failure highlighting.

**Acceptance Scenarios**:

1. **Given** the collector is running, **When** a Python application emits valid events for a single trace, **Then** the collector persists them and the trace can be retrieved by trace identifier containing the emitted events.
2. **Given** a trace emitted from Python is retrieved, **When** it is rendered in the UI, **Then** nodes and edges appear deterministically and node payload inspection matches what the Python application emitted.
3. **Given** a Python application emits an `error` event (or an event with `status = error`), **When** the trace is rendered, **Then** failure events are visually highlighted and can be inspected.

---

### User Story 2 - LangChain Python Users Can Attach an Adapter (Priority: P2)

As a LangChain (Python) user, I want to attach an AeroGraph adapter to my LangChain workflow, so prompts, responses, tool calls, tool results, retrieval context, LangGraph state snapshots, and checkpoints are recorded automatically with a deterministic mapping.

**Why this priority**: Framework adapters are the primary adoption path for Python ecosystems; they reduce integration to “add one handler.”

**Independent Test**: Run a small LangChain Python workflow with the adapter enabled and confirm the resulting trace includes at least: prompt, response, tool call/result (if tools are used), retriever context (if retrieval is used), and state/checkpoint events (if LangGraph/checkpoints are used).

**Acceptance Scenarios**:

1. **Given** a LangChain Python workflow with the AeroGraph adapter attached, **When** the workflow executes, **Then** the adapter emits normalized trace events that pass collector validation.
2. **Given** the same LangChain workflow is executed twice with stable run identifiers, **When** traces are compared by structure, **Then** parent/child relationships and event ordering are deterministic for the same execution.
3. **Given** the adapter observes framework-specific metadata that does not fit first-class fields, **When** it is emitted, **Then** it is serialized into schema-approved payload maps without introducing new top-level fields.

---

### User Story 3 - Maintainers Prevent Cross-Language Contract Drift (Priority: P3)

As a maintainer, I want a language-neutral contract artifact and automated compatibility checks, so Python and TypeScript implementations remain interoperable and schema changes cannot silently break one runtime.

**Why this priority**: Without drift control, “contracts as source of truth” becomes TypeScript-only and Python support degrades quickly.

**Independent Test**: Change the canonical contracts and confirm CI fails unless the language-neutral contract artifact and generated/validated Python models are updated consistently.

**Acceptance Scenarios**:

1. **Given** a change to the canonical contracts, **When** CI runs, **Then** schema drift checks fail until the language-neutral contract artifact is updated.
2. **Given** a Python SDK release, **When** CI runs, **Then** it verifies that Python’s contract models match the language-neutral contract artifact.

---

### Edge Cases

- Events emitted from Python arrive out-of-order or with identical timestamps.
- Duplicate `(traceId, spanId)` emissions occur due to retries.
- Network failures or collector downtime occurs while emitting events.
- Payloads include non-JSON-native types (bytes, datetime objects, custom classes) in Python.
- State snapshots include large state objects or deeply nested structures.
- Floating point or numeric formatting differences could alter canonical serialization.

## Requirements *(mandatory)*

### Functional Requirements

**Architecture and invariants**

- **FR-001**: System MUST keep the existing shared contracts as the canonical source of truth for event shapes and API responses.
- **FR-002**: System MUST keep the collector as the single ingestion endpoint for all runtimes.
- **FR-003**: System MUST preserve append-only event storage and MUST NOT introduce mutation of historical events.
- **FR-004**: System MUST preserve deterministic replay reconstruction behavior for traces, including deterministic ordering and deterministic lineage/diff/analysis results for the same stored data.
- **FR-005**: System MUST keep the event format language-neutral (JSON-serializable) and MUST reject events that do not conform to the canonical schema.

**Python SDK (Phase 3 deliverable)**

- **FR-006**: System MUST provide a Python SDK that can emit the same normalized event kinds as the existing SDK: prompt, response, tool_call, tool_result, handoff, error, note, state_snapshot, retriever, checkpoint.
- **FR-007**: Python SDK MUST emit TraceEvent JSON structures identical in field names and semantics to the canonical contracts.
- **FR-008**: Python SDK MUST inject the current `schemaVersion` automatically for all emitted events.
- **FR-009**: Python SDK MUST generate `traceId` and `spanId` when absent, while allowing callers to supply stable IDs.
- **FR-010**: Python SDK MUST support both synchronous and asynchronous event emission.
- **FR-011**: Python SDK MUST support batching multiple events into a single ingestion request.
- **FR-012**: Python SDK MUST provide a context-manager style tracing API that simplifies span lifecycle for common workflows.
- **FR-013**: Python SDK MUST preserve deterministic event ordering behavior such that two equivalent runs produce deterministically comparable traces when provided stable identifiers and timestamps. Where the SDK orders or batches events, it MUST use a stable ordering rule that is consistent with the platform’s deterministic event comparisons (timestamp first, then stable identifiers).

**Cross-language contract governance (Phase 3 deliverable)**

- **FR-014**: System MUST produce a language-neutral contract artifact by exporting JSON Schema from the canonical contracts.
- **FR-015**: System MUST version the exported JSON Schema and ensure it is updated whenever the canonical contracts change.
- **FR-016**: System MUST support generating Python contract models from the exported JSON Schema or validating Python contract models against it.

**Python LangChain adapter (Phase 3 deliverable)**

- **FR-017**: System MUST provide a Python LangChain adapter that deterministically maps LangChain execution callbacks into normalized trace events.
- **FR-018**: The adapter MUST emit streaming telemetry in a schema-compliant way when token streaming information is available.
- **FR-019**: The adapter MUST emit retrieval context (query + documents + metadata) in a schema-compliant way when retrieval is used.
- **FR-020**: The adapter MUST emit state snapshots and checkpoint events when graph/state transitions are available, without violating append-only or replay-safety guarantees.
- **FR-021**: The adapter MUST preserve span relationships (`spanId`, `parentSpanId`) derived from the framework execution tree so the UI reconstructs a deterministic graph.

**Future-ready Python adapter surface (non-Phase 3, future phases)**

- **FR-022**: System SHOULD define a consistent adapter interface for additional Python frameworks (LangGraph, AutoGen, CrewAI, PydanticAI, OpenAI Agents SDK) that reuses the Python SDK and canonical contracts.
- **FR-023**: Phase 3 MUST limit implementation scope to LangChain Python; other frameworks MUST be treated as explicit future targets.

**Cross-language deterministic hashing**

- **FR-024**: System MUST define canonical serialization rules for any data used in deterministic hashing so different runtimes compute the same hash for the same semantic state. Canonical serialization MUST:
	- treat objects as key/value maps with keys sorted lexicographically (recursively)
	- preserve array ordering
	- serialize to JSON without adding whitespace
	- reject or pre-normalize non-finite numbers and non-JSON-native values before hashing
- **FR-025**: Cross-language state hashes MUST match byte-for-byte for the same canonicalized state so traces emitted from different runtimes remain comparable.
	- For backward compatibility, Python MUST match the current TypeScript state-hash behavior for the same canonicalized state.
	- The canonical JSON string MUST be hashed using the same 32-bit FNV-1a procedure currently used by the platform.
	- Hashing MUST operate over the JSON string’s code units in the same way as JavaScript string iteration (so non-ASCII characters and surrogate pairs produce the same result).
	- The hash output MUST be a lowercase hexadecimal string padded to 8 characters.

**Testing and CI**

- **FR-026**: System MUST add automated Python unit tests covering event construction, schema adherence, batching, and sync/async emission behavior.
- **FR-027**: System MUST add integration tests that emit events from Python into a running collector and verify retrieval behavior.
- **FR-028**: System MUST add contract compatibility tests that verify Python models match the language-neutral contract artifact.
- **FR-029**: System MUST add schema drift detection that fails CI when canonical contracts and language-neutral artifacts diverge.

**Documentation**

- **FR-030**: System MUST provide a Python quickstart showing how to emit events and view traces in the existing UI.
- **FR-031**: System MUST provide a LangChain Python example showing adapter attachment and expected event coverage.
- **FR-032**: System MUST provide a collector integration example that documents endpoint configuration, batching, and failure handling.

### Key Entities *(include if feature involves data)*

- **Python Flight Recorder**: A client library that constructs and emits normalized trace events to the collector.
- **Python Adapter**: A framework-specific integration that translates native execution signals into normalized trace events.
- **Language-Neutral Contract Artifact**: A generated contract representation used to validate or generate runtime-specific models.
- **Canonical Serialization Rules**: Defined rules that make hashing and deterministic comparisons consistent across runtimes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Python user can instrument a small workflow and see a trace in the UI within 10 minutes using only the provided documentation.
- **SC-002**: A Python-emitted trace renders deterministically such that repeated runs with stable identifiers produce the same parent/child relationships and ordering.
- **SC-003**: Contract drift detection prevents merging changes that would cause Python and TypeScript implementations to disagree on event shapes.
- **SC-004**: Python SDK emission overhead remains low enough that recording does not materially slow down typical local workflows (qualitative verification via demo; quantitative thresholds defined during planning).
- **SC-005**: CI runs Python unit tests, Python-to-collector integration tests, and schema compatibility checks on every PR, and fails deterministically on drift.

## Assumptions

- Users run the existing collector and UI unchanged and point Python emitters at the collector endpoint.
- Python event payloads are JSON-serializable; non-serializable objects are converted to JSON-compatible forms by the adapter/SDK.
- Phase 3 delivers LangChain Python only; additional Python framework adapters are scoped to later phases.
- Deterministic hashing applies only to explicitly designated payload fields (such as state snapshots) and excludes inherently non-deterministic data unless canonicalized.
- Python unit tests are authored and executed using pytest as the standard test runner.
