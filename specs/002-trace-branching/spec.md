# Feature Specification: Agent Flight Recorder — Phase 2 (Trace Branching & Diff)

**Feature Branch**: `002-phase2-branching`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Design Phase 2 for Agent Flight Recorder. Goals: trace branching/forking, trace diff visualization, loop detection heuristics, multi-agent execution trees, replay timeline improvements, branch lineage tracking. Constraints: preserve append-only replay-safe storage, maintain strict contract-schema governance, no distributed infrastructure yet, local database remains source of truth, deterministic reconstruction is mandatory."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fork a Trace and Track Lineage (Priority: P1)

As an AI developer iterating on an agent workflow, I want to fork execution from a chosen point in an existing trace and have the system track branch lineage across derived runs, so I can safely explore changes without losing the original run.

**Why this priority**: Forking and lineage are the foundation for Phase 2 capabilities (diffing, loop analysis across branches, and improved replay navigation). Without reliable lineage, derived runs become hard to understand and compare.

**Independent Test**: Using a previously captured trace, select a fork point, supply an input override, generate a derived run, then confirm the original trace is unchanged and the derived trace is linked and visible in a lineage view.

**Acceptance Scenarios**:

1. **Given** an existing trace and a user-selected fork point, **When** the user requests a fork with an input override, **Then** a new derived trace is created and linked to its parent trace with a recorded fork point.
2. **Given** a parent trace with multiple derived traces, **When** the user views the lineage, **Then** the system presents the parent/child relationships and lets the user navigate between branches.
3. **Given** a trace that includes multiple agents, **When** the user inspects the derived trace, **Then** the execution view makes it clear which agent produced each step and how handoffs relate to the selected branch.

---

### User Story 2 - Visualize Differences Between Branches (Priority: P2)

As an AI developer diagnosing why a change worked (or failed), I want to compare two related traces and visually see where their paths or outcomes diverge, so I can quickly identify the smallest meaningful difference.

**Why this priority**: The practical value of forking comes from being able to compare branches and understand why behavior changed.

**Independent Test**: Generate two derived traces from the same parent (or a parent and child), request a comparison, and verify the system highlights differences in both structure (added/removed steps) and content (changed payloads).

**Acceptance Scenarios**:

1. **Given** two related traces (same lineage), **When** the user requests a diff, **Then** the system identifies and presents added, removed, and changed steps and payloads.
2. **Given** a diff result, **When** the user navigates to the divergence point, **Then** the system highlights the branch point and the first downstream difference.

---

### User Story 3 - Detect and Explain Likely Loops (Priority: P3)

As an AI developer preventing runaway behavior and wasted cost, I want the system to detect likely loops in a trace (including multi-agent cycles and repeated sequences) and explain what triggered the warning, so I can quickly decide how to mitigate it.

**Why this priority**: Loop detection is a high-impact diagnostic for agent systems and becomes more valuable when combined with branching (to validate fixes across derived runs).

**Independent Test**: Ingest a trace that contains repeated patterns indicative of a loop, then confirm the system flags the relevant segment(s) and provides a clear explanation of why it is considered loop-like.

**Acceptance Scenarios**:

1. **Given** a trace with repeated sequences or cyclic handoffs, **When** the trace is analyzed, **Then** the system flags the likely loop segment(s) and provides an explanation and navigation target(s).

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

## Requirements *(mandatory)*

### Functional Requirements

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

#### Replay Invariants (Non-Negotiable)

- **FR-012**: Stored traces and derived traces MUST remain replay-safe: the information needed to reconstruct execution order and relationships is never silently lost.
- **FR-013**: Reconstruction MUST be deterministic: given the same stored data, the system produces the same lineage and ordering every time.

#### Branch Lineage Rules

- **FR-014**: A derived trace MUST reference exactly one parent trace and exactly one fork point within that parent.
- **FR-015**: Lineage MUST be append-only: new derived traces can be added, but existing lineage relationships MUST NOT be rewritten.
- **FR-016**: The lineage graph MUST be acyclic (no derived trace can be its own ancestor).

### Key Entities *(include if feature involves data)*

- **Trace**: A single recorded execution containing steps and their relationships.
- **Trace Step**: A normalized record representing a prompt, response, tool interaction, handoff, or other meaningful execution event.
- **Fork Point**: A reference to a specific step in a trace that serves as the origin for a derived run.
- **Derived Trace (Branch)**: A trace produced from a fork point of a parent trace, linked by lineage metadata.
- **Lineage Graph**: The set of parent/child relationships across related traces.
- **Diff Result**: A comparison artifact describing structural and content differences between two traces.
- **Loop Warning**: A diagnostic artifact that flags a likely loop segment and explains why it was flagged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can fork from a selected point and see the derived trace in the lineage view in under 30 seconds.
- **SC-002**: The original trace remains unchanged after forking (verified by reloading and comparing the parent trace’s recorded steps).
- **SC-003**: For two related traces with up to 2,000 steps each, the system can produce and display a diff in under 5 seconds.
- **SC-004**: For known loop-pattern traces, the system flags the loop segment(s) with an explanation such that a user can navigate to the first flagged segment in under 10 seconds.
- **SC-005**: Lineage reconstruction is deterministic: repeated retrievals of the same lineage produce identical branch ordering and relationships.

## Assumptions

- Phase 2 builds on Phase 1’s schema-governed event capture and validation, and does not relax contract governance.
- The product remains developer-first and single-environment: no multi-tenant hosting and no distributed infrastructure in this phase.
- Storage remains append-only and local, and derived traces are represented without mutating existing recorded runs.
- Some steps may represent irreversible side effects; these steps are explicitly represented so users are not misled about replay safety.
