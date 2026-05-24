# Feature Specification: AeroGraph

**Feature Branch**: `001-agent-flight-recorder`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Build an open-source AI AeroGraph that captures prompts, responses, tool calls, and handoffs across multi-agent workflows, then visualizes them as an interactive trace graph with payload inspection, replay, diffing, loop detection, and failure highlighting."

## Phase Scope

### Phase 1 (MVP)

Phase 1 is a strict vertical slice focused on **User Story 1** only: capture, validate, persist, retrieve, and visualize traces with payload inspection and failure highlighting.

Phase 1 explicitly defers:

- Replay/fork workflows
- Diffing traces
- Loop detection and loop highlighting

This keeps Phase 1 aligned with the Phase 1-only scope guard in `specs/001-agent-flight-recorder/tasks.md`.

### Future Phases (Phase 2+)

Future phases add replay/fork, diffing, and loop detection capabilities, built on the same schema-as-truth foundation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture & Inspect a Trace (Priority: P1)

As an AI developer debugging a multi-agent workflow, I want to capture a complete trace (prompts, responses, tool calls, and agent handoffs) and view it as an interactive graph, so I can quickly understand what happened and where it failed.

**Why this priority**: This is the core value of a “flight recorder”: turning opaque agent behavior into an inspectable trace.

**Independent Test**: Run a representative multi-agent workflow that emits trace events, then confirm the system can ingest, store, and render the resulting trace graph; verify clicking nodes shows the payload and failures are highlighted.

**Acceptance Scenarios**:

1. **Given** a multi-agent workflow emits normalized trace events, **When** the system ingests them, **Then** the trace can be retrieved and rendered as an interactive graph.
2. **Given** a rendered trace graph, **When** a user selects a node, **Then** the system displays the full payload for that event (prompt/response/tool input/tool output/handoff metadata).
3. **Given** one or more events are marked as failed, **When** the trace is rendered, **Then** failure events are visually highlighted and can be inspected.

---

### User Story 2 - Replay/Fork and Diff a Trace (Priority: P2)

As an AI developer iterating on a workflow, I want to replay or fork execution from a chosen point with modified inputs, and diff the new trace against the original, so I can understand what changed and why the outcome differs.

**Why this priority**: Debugging and tuning often requires re-running from a known point and comparing outcomes.

**Independent Test**: Select a trace event as a fork point, provide an input override, generate a new trace linked to the original, then compare the two traces and confirm differences are identified and presented.

**Acceptance Scenarios**:

1. **Given** an existing trace and a selected fork point, **When** the user requests replay/fork with an override, **Then** a new trace is created and linked to the original trace as a derived run.
2. **Given** two related traces, **When** the user requests a diff, **Then** the system identifies and presents which events/nodes diverge (added/removed/changed payloads).

---

### User Story 3 - Detect Loops and Highlight Risk (Priority: P3)

As an AI developer preventing runaway costs and failures, I want the system to detect likely loops in the trace and highlight them, so I can quickly identify recursion/retry patterns and take action.

**Why this priority**: Loops are common and costly failure modes in multi-agent systems.

**Independent Test**: Run a workflow that repeats a step pattern, ingest the resulting trace, and verify loop detection marks the repeated segment(s) and surfaces a warning.

**Acceptance Scenarios**:

1. **Given** a trace contains a repeated sequence pattern indicative of a loop, **When** the trace is analyzed/rendered, **Then** the loop segment is flagged and highlighted.

---

### Edge Cases

- Events arrive out-of-order or with identical timestamps.
- Missing parent references (orphaned events) must still be viewable.
- Partial traces (workflow crashes mid-run) must remain inspectable.
- Very large traces must remain navigable (e.g., thousands of events).
- Invalid events (schema violations) are rejected with actionable errors.

## Requirements *(mandatory)*

### Phase 1 (MVP) Functional Requirements

- **FR-001**: System MUST define a versioned event schema that represents prompts, responses, tool calls, and agent handoffs.
- **FR-002**: System MUST validate incoming events against the event schema; invalid events MUST be rejected with a clear error.
- **FR-003**: System MUST provide a shared contract derived from the event schema that is used by adapters, backend, and UI (no bypasses).
- **FR-004**: System MUST provide an adapter mechanism that can emit normalized events for multi-agent workflows.
- **FR-005**: All adapters MUST emit normalized trace events using a deterministic mapping from source events to the shared schema.
- **FR-006**: System MUST ingest and persist trace events and allow retrieving a trace by trace identifier.
- **FR-007**: System MUST visualize a trace as an interactive graph where nodes represent events and edges represent relationships needed to understand execution flow.
- **FR-008**: System MUST support payload inspection: selecting a node reveals the full structured payload associated with the event.
- **FR-009**: System MUST highlight failures: events marked as failed must be visually distinct and easily discoverable.
- **FR-010**: System MUST preserve trace replayability: stored traces must retain enough information to replay/fork and to compare runs without silently losing required context.
- **FR-014**: Backend, UI, and adapters MUST remain modular (clear boundaries, shared contracts, minimal cross-coupling).
- **FR-015**: Tests are mandatory for the event schema, adapters, and replay behavior.

### Future Phase Requirements (Phase 2+)

- **FR-011**: System MUST support replay/fork from a selected point, producing a new trace linked to the original.
- **FR-012**: System MUST support diffing between two traces and present divergences in a way that helps users understand behavioral changes.
- **FR-013**: System MUST detect likely loops in traces and surface loop warnings and highlighted segments.

### Key Entities *(include if feature involves data)*

- **Trace**: A single workflow execution containing a set of events and their relationships.
- **Trace Event**: A normalized record for a prompt, response, tool call, handoff, or failure.
- **Adapter**: A module that maps framework-native execution signals into normalized trace events.
- **Replay/Fork Run**: A trace derived from a prior trace and a fork point, possibly with input overrides.
- **Diff Result**: A comparison artifact describing how two traces diverge.
- **Loop Warning**: An analysis artifact indicating likely repetitive patterns in a trace.

## Success Criteria *(mandatory)*

### Phase 1 Success Criteria

- **SC-001**: A user can capture and view a complete trace for a multi-agent run and locate a failure event in under 60 seconds.
- **SC-002**: Selecting any node in a trace graph reveals its payload within 1 second for typical traces.
- **SC-005**: Schema, adapter normalization, and replay behavior are covered by automated tests that run in CI and must pass before merge.

### Future Phase Success Criteria (Phase 2+)

- **SC-003**: Replay/fork produces a new, linked trace and a diff that identifies divergences with no missing references.
- **SC-004**: Loop detection flags repeated patterns with an explained warning and highlights the relevant trace segment.

## Assumptions

- Initial release prioritizes a local, developer-first workflow (single user, local traces) over multi-tenant hosting.
- Authentication/authorization is out of scope for the first release unless explicitly required.
- The platform provides a general adapter mechanism and at least one reference adapter; broader framework coverage is iterative.
- Replay/fork is supported as a platform capability; full re-execution depends on integration support and must not compromise safety or replayability.
