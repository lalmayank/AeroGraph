# Feature Specification: AeroGraph — Phase 2 & 2.5 (Trace Branching & Advanced Observability)

**Feature Branch**: `002-phase2-branching`

**Created**: 2026-05-21 (Updated for Phase 2.5)

**Status**: Draft

**Input**: User description: "Design Phase 2 for AeroGraph. Goals: trace branching/forking, trace diff visualization, loop detection heuristics, multi-agent execution trees, replay timeline improvements, branch lineage tracking. Phase 2.5 extending with LangGraph state tracking, LCEL streaming telemetry, RAG payload inspection, Human Checkpoint Events. Constraints: preserve append-only replay-safe storage, maintain strict contract-schema governance, no distributed infrastructure yet, local database remains source of truth, deterministic reconstruction is mandatory. NO execution orchestration, NO runtime resume engines, NO non-deterministic analysis, NO replay mutation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fork a Trace and Track Lineage (Priority: P1)

As an AI developer iterating on an agent workflow, I want to fork execution from a chosen point in an existing trace and have the system track branch lineage across derived runs, so I can safely explore changes without losing the original run.

**Why this priority**: Forking and lineage are the foundation for Phase 2 capabilities (diffing, loop analysis across branches, and improved replay navigation).

**Independent Test**: Using a previously captured trace, select a fork point, supply an input override, generate a derived run, then confirm the original trace is unchanged and the derived trace is linked and visible in a lineage view.

**Acceptance Scenarios**:
1. **Given** an existing trace and a user-selected fork point, **When** the user requests a fork with an input override, **Then** a new derived trace is created and linked to its parent trace with a recorded fork point.
2. **Given** a parent trace with multiple derived traces, **When** the user views the lineage, **Then** the system presents the parent/child relationships and lets the user navigate between branches.
3. **Given** a trace that includes multiple agents, **When** the user inspects the derived trace, **Then** the execution view makes it clear which agent produced each step and how handoffs relate to the selected branch.

---

### User Story 2 - Visualize Differences Between Branches (Priority: P2)

As an AI developer diagnosing why a change worked (or failed), I want to compare two related traces and visually see where their paths or outcomes diverge, so I can quickly identify the smallest meaningful difference.

**Why this priority**: The practical value of forking comes from being able to compare branches and understand why behavior changed.

**Independent Test**: Generate two derived traces from the same parent, request a comparison, and verify the system highlights differences in both structure and content.

**Acceptance Scenarios**:
1. **Given** two related traces, **When** the user requests a diff, **Then** the system identifies and presents added, removed, and changed steps and payloads.
2. **Given** a diff result, **When** the user navigates to the divergence point, **Then** the system highlights the branch point and the first downstream difference.

---

### User Story 3 - Detect and Explain Likely Loops (Priority: P3)

As an AI developer preventing runaway behavior, I want the system to detect likely loops in a trace (including multi-agent cycles) and explain what triggered the warning, so I can quickly decide how to mitigate it.

**Why this priority**: Loop detection is a high-impact diagnostic for agent systems.

**Independent Test**: Ingest a trace that contains repeated patterns indicative of a loop, then confirm the system flags the relevant segment(s) and provides a clear explanation.

**Acceptance Scenarios**:
1. **Given** a trace with repeated sequences, **When** the trace is analyzed, **Then** the system flags the likely loop segment(s) and provides an explanation.

---

### User Story 4 - LangGraph State Tracking (Priority: P1)

As a developer building complex LangGraph agents, I want the system to capture deterministic snapshots of the full LangGraph state at node transitions, so I can inspect the exact state payload that was passed between steps without needing to add manual logs.

**Why this priority**: State visibility is critical for debugging advanced agent graphs. Without tracking state snapshots and diffs, it is impossible to know what each node modified.

**Independent Test**: Execute a LangGraph workflow, then inspect the generated trace to verify state snapshots are recorded per transition, including stateDiff metadata and state hashes.

**Acceptance Scenarios**:
1. **Given** a running LangGraph execution, **When** a node transition occurs, **Then** the system captures a deterministic snapshot, its hash, and stateDiff metadata.
2. **Given** a recorded trace with LangGraph state, **When** the user views it in the web UI, **Then** the payload inspection supports viewing state changes per transition.

---

### User Story 5 - LCEL Streaming Telemetry (Priority: P2)

As a developer evaluating LLM latency, I want the system to capture streaming metrics (TTFT, total duration, tokens/second) without blocking the token flow, so I can optimize my models and prompts for user responsiveness.

**Why this priority**: Latency observability is necessary for production-ready agents, but it must not degrade the actual streaming performance.

**Independent Test**: Stream a response from an LLM via LCEL, then verify the trace contains accurate TTFT, total duration, and streamed token count without stuttering the output.

**Acceptance Scenarios**:
1. **Given** an LLM node that is streaming tokens, **When** the tokens arrive, **Then** the system tracks TTFT, duration, tokens/sec, and token count via `handleLLMNewToken` hooks without blocking flow.
2. **Given** the trace in the web UI, **When** I inspect the LLM step, **Then** the performance metrics are visible in normalized metadata fields.

---

### User Story 6 - RAG Retrieval Payload Inspection (Priority: P2)

As a developer tuning RAG pipelines, I want to capture retriever callback payloads, so I can inspect retrieved chunks, relevance scores, and metadata to understand why certain context was provided to the LLM.

**Why this priority**: Context quality is the primary failure point in RAG. Being able to inspect exactly what was retrieved is essential for debugging hallucination or missing information.

**Independent Test**: Execute a retriever node, then verify the exact list of chunks, their ordering, and source metadata are stored safely and viewable in the UI.

**Acceptance Scenarios**:
1. **Given** a RAG retriever execution, **When** chunks are retrieved, **Then** the callback payloads (chunks, scores, source metadata, ordering) are captured and normalized via `@afr/contracts`.
2. **Given** the trace in the web UI, **When** I inspect the retriever step, **Then** I can see the exact retrieved chunks and their scores.

---

### User Story 7 - Human Checkpoint Events (Priority: P3)

As a developer using Human-in-the-Loop workflows, I want the system to capture wait and interrupt events, so I can see exactly when and why the agent paused for human intervention, even without orchestration capabilities.

**Why this priority**: Human-in-the-Loop is common in advanced agents. Capturing the state and reason for the pause is necessary for completeness, even if resume functionality is out of scope.

**Independent Test**: Trigger a wait/interrupt in an agent workflow, then verify the event is recorded in the trace with the appropriate schema.

**Acceptance Scenarios**:
1. **Given** an agent execution that pauses for a human checkpoint, **When** the interrupt occurs, **Then** the system records the checkpoint/wait event.
2. **Given** a recorded checkpoint event, **When** inspecting the system, **Then** there is no mechanism to resume execution from the platform itself (capture-only).

---

### Edge Cases

- Fork requests from a trace that is partial (the run ended unexpectedly).
- Multiple forks from the same fork point create many sibling branches.
- Fork points refer to a step that is missing or cannot be referenced (corrupt or incomplete lineage data).
- A derived run produces fewer steps than its parent (early exit) or many more steps (expanded search).
- Differences are purely ordering-related (same steps, different ordering) versus content-related (payload changes).
- Loops that are benign retries (short, bounded) versus runaway loops (unbounded or escalating).
- Multi-agent loops where the repeated pattern is a handoff cycle rather than identical step payloads.
- Steps that represent side effects or irreversible actions must not be treated as safe to replay.
- LangGraph state objects that contain non-serializable elements (closures, connections) during snapshot capture.
- Streaming payloads where chunks arrive out of order or fail mid-stream.
- Retrievers returning massive payloads that exceed standard step size limits.

## Requirements *(mandatory)*

### Functional Requirements

#### Trace Branching & Lineage
- **FR-001**: System MUST support creating a derived trace by forking from a user-selected point in an existing trace.
- **FR-002**: System MUST record branch lineage so derived traces can be navigated as a lineage graph (parent/child relationships).
- **FR-003**: System MUST preserve the original trace as immutable when derived traces are created (no retroactive edits).
- **FR-004**: System MUST provide a clear, human-readable representation of multi-agent execution across a trace (including agent handoffs).
- **FR-005**: System MUST provide an improved replay timeline view that helps users navigate: (a) the fork point, (b) the derived run, and (c) the lineage context.
- **FR-006**: System MUST support comparing two traces in the same lineage and producing a diff result.
- **FR-007**: Diff results MUST identify differences in structure (steps added/removed) and in content (step payload changes).
- **FR-008**: Diff visualization MUST make the divergence point discoverable and allow users to navigate to it.
- **FR-009**: System MUST analyze traces for likely loops using deterministic heuristics.
- **FR-010**: Loop warnings MUST include: the flagged segment(s), the reason for the warning, and a confidence level or severity indicator.
- **FR-011**: Loop detection MUST work for single-agent repeats and multi-agent cycles (handoff loops).

#### LangGraph State Tracking
- **FR-012**: System MUST capture full LangGraph state snapshots at node transitions.
- **FR-013**: System MUST store deterministic state hashes and calculate `stateDiff` metadata between transitions using helper functions in `@afr/contracts`.
- **FR-014**: State snapshots MUST be recorded in an append-only manner, preserving replay determinism.
- **FR-015**: Web UI MUST provide payload inspection support for LangGraph states and diffs.

#### LCEL Streaming Metrics
- **FR-016**: System MUST hook into `handleLLMNewToken` to track streaming telemetry.
- **FR-017**: Streaming metrics MUST track `timeToFirstToken` (TTFT), total streaming duration, `tokensPerSecond`, and streamed token count.
- **FR-018**: Capture mechanisms MUST NOT block or delay the token stream delivery.
- **FR-019**: Metrics MUST be persisted as normalized metadata fields in the schema.

#### RAG Retrieval Payloads
- **FR-020**: System MUST capture retriever callback payloads, including retrieved chunks, relevance scores, source metadata, and retrieval ordering.
- **FR-021**: Retriever events MUST be normalized through `@afr/contracts`.
- **FR-022**: Web UI MUST provide payload inspection support for retrieved contexts.

#### Human Checkpoint Events
- **FR-023**: System MUST support capturing human checkpoint and wait states with defined schemas.
- **FR-024**: System MUST strictly operate in capture-only mode for checkpoints (NO replay resume execution or orchestration control).

#### Replay Invariants & Governance (Non-Negotiable)
- **FR-025**: Stored traces and derived traces MUST remain replay-safe.
- **FR-026**: Reconstruction MUST be deterministic.
- **FR-027**: Lineage MUST be append-only and acyclic.
- **FR-028**: Schema evolution MUST be additive only; any required database changes MUST be made via migration-safe SQLite schemas.
- **FR-029**: `@afr/contracts` MUST remain the source of truth for all schemas.

### Key Entities *(include if feature involves data)*

- **Trace**: A single recorded execution containing steps and their relationships.
- **Trace Step**: A normalized record representing a prompt, response, tool interaction, handoff, or other meaningful execution event.
- **Fork Point**: A reference to a specific step in a trace that serves as the origin for a derived run.
- **Derived Trace (Branch)**: A trace produced from a fork point of a parent trace, linked by lineage metadata.
- **Lineage Graph**: The set of parent/child relationships across related traces.
- **Diff Result**: A comparison artifact describing structural and content differences between two traces.
- **Loop Warning**: A diagnostic artifact that flags a likely loop segment.
- **State Snapshot**: A deterministic, hashed record of a LangGraph state at a specific point in time.
- **Streaming Metrics**: Normalized telemetry data describing an LLM streaming interaction.
- **Retriever Payload**: Normalized structure capturing the chunks and metadata returned by a RAG retriever.
- **Checkpoint Event**: An immutable record that execution paused for human intervention.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can fork from a selected point and see the derived trace in the lineage view in under 30 seconds.
- **SC-002**: The original trace remains unchanged after forking (verified by reloading and comparing the parent trace’s recorded steps).
- **SC-003**: For two related traces with up to 2,000 steps each, the system can produce and display a diff in under 5 seconds.
- **SC-004**: For known loop-pattern traces, the system flags the loop segment(s) with an explanation such that a user can navigate to the first flagged segment in under 10 seconds.
- **SC-005**: Lineage reconstruction is deterministic: repeated retrievals of the same lineage produce identical branch ordering and relationships.
- **SC-006**: State hashes for identical state payloads compute to the exact same hash across repeated runs.
- **SC-007**: LCEL telemetry adds < 5ms of overhead to TTFT and total streaming duration.
- **SC-008**: RAG and Checkpoint payloads are fully queryable through the normalized `@afr/contracts` schema without loss of data.

## Assumptions

- Phase 2 builds on Phase 1’s schema-governed event capture and validation, and does not relax contract governance.
- The product remains developer-first and single-environment: no multi-tenant hosting and no distributed infrastructure in this phase.
- Storage remains append-only and local, and derived traces are represented without mutating existing recorded runs.
- LangGraph states can be serialized; objects that strictly cannot be serialized (e.g. database connections) will be scrubbed before hashing.
- UI visualizations can fetch large state diffs and retriever payloads on demand to preserve fast initial page loads.
