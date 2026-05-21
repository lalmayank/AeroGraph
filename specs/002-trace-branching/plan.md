# Implementation Plan: Agent Flight Recorder — Phase 2 (Trace Branching & Diff)

**Branch**: `002-phase2-branching` | **Date**: 2026-05-21 | **Spec**: specs/002-trace-branching/spec.md

**Input**: Feature specification in specs/002-trace-branching/spec.md

**Note**: This plan is documentation only (no implementation changes). It is contract-first, constitution-driven, and incremental (no rewrites).

## Summary

Add Phase 2 capabilities to the local-first Agent Flight Recorder: lineage-aware derived traces (forking/branching), deterministic diff visualization between lineage-related traces, deterministic loop detection (including multi-agent handoff cycles), and replay timeline improvements to navigate branches. All new storage, APIs, and UI flows remain contract-driven via `@afr/contracts` and preserve append-only, replay-safe storage.

## Technical Context

**Language/Version**: TypeScript (TS 5.x), Node.js (LTS)

**Primary Dependencies**:
- Schema/contracts: Zod (`@afr/contracts`)
- Collector: Express + CORS
- Storage: SQLite via `better-sqlite3`
- UI: React + Vite + React Flow

**Storage**:
- SQLite remains the single source of truth.
- `events` remains append-only and is never updated in-place.

**Testing**: Vitest (contract + collector + analysis determinism)

**Target Platform**: Local dev on Windows/macOS/Linux

**Project Type**: TypeScript monorepo with npm workspaces (`apps/*`, `packages/*`)

**Performance Goals**:
- Diff: compute and return a deterministic diff for two traces up to 2,000 events each within 5 seconds on a typical dev machine.
- UI: keep lineage navigation and divergence jumps responsive for typical traces.

**Constraints**:
- Append-only replay-safe storage (no mutation of historical traces)
- Deterministic reconstruction (ordering, lineage, diff, analysis)
- Lineage is acyclic and append-only
- No distributed infrastructure (no queues, OTel pipelines, Kubernetes)
- Contract-driven APIs and UI (no schema bypasses)

**Scale/Scope**:
- Phase 2 remains single-environment and local-first.
- Focus on lineage-related compare and analysis, not arbitrary cross-trace comparisons.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Event schema is the source of truth (schema drives contracts/types/storage/UI).
- No UI logic bypasses shared contracts.
- Adapters emit normalized trace events with a deterministic mapping.
- Implementation preserves trace replayability (no silent data loss).
- Tests are included and required for schema, adapters, and replay behavior.
- Unclear requirements are marked NEEDS CLARIFICATION (do not invent APIs).

Status: PASS (Phase 2 is additive: contracts evolve first, then collector/web follow).

## Project Structure

### Documentation (this feature)

```text
specs/002-trace-branching/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md            # Produced by /speckit.tasks (not part of this command)
```

### Source Code (repository root)

```text
apps/
├── collector/          # ingest + validation + SQLite persistence + lineage/diff/analysis endpoints
├── web/                # trace graph UI + lineage navigation + diff/loop surfacing
└── demo/               # demo emitter for local smoke tests

packages/
├── contracts/          # canonical schemas: events + lineage + diff + analysis shapes
├── sdk/                # emitter helpers + (Phase 2) client helpers for fork/lineage/diff
└── adapter-langchain/  # framework adapter(s)
```

**Structure Decision**: Keep Phase 2 changes within existing workspaces. Contracts remain the sole interface surface; collector/web must validate against them.

## Package Boundary & Dependency Graph

Allowed dependencies (Phase 2):

```text
@afr/contracts
  ↑
@afr/sdk
  ↑             ↑
apps/demo     apps/collector
                 ↑
              apps/web

@afr/adapter-langchain
  ↑
@afr/sdk
```

Rules:
- `packages/contracts` must not import from any other workspace package.
- Collector and web validate inputs/outputs using `@afr/contracts` schemas.
- Diff/loop analysis logic is shared only via contracts and small pure helper utilities (avoid duplicating schema copies).

## Architecture

### Phase 2 invariants (explicit)

Replay invariants:
- The `events` table remains append-only.
- Forking creates new traces; parent traces are never mutated.
- Derived traces retain enough information to reconstruct lineage, ordering, and fork points deterministically.

Lineage invariants:
- Each derived trace references exactly one parent trace and one fork point.
- Lineage edges are append-only.
- The lineage graph is acyclic.

Diff/analysis invariants:
- Diff and loop analysis are pure functions of stored trace data.
- Outputs are deterministic and testable.

### Storage evolution (SQLite)

Current baseline:
- `events(id, trace_id, span_id, parent_span_id, occurred_at, kind, event_data)` with a unique constraint on `(trace_id, span_id)`.

Phase 2 additive tables:

1) `traces` (trace-level metadata)
- `trace_id` (PK)
- `created_at`, `updated_at`
- `event_count`, `root_span_id`

2) `trace_derivations` (append-only lineage edges)
- `child_trace_id` (PK; a trace can only have one parent)
- `parent_trace_id`
- `forked_from_span_id`
- `created_at`
- `overrides_json` (recorded fork overrides; schema-governed)

Indexes:
- `trace_derivations(parent_trace_id)` for child lookup
- `events(trace_id)` already exists; add optional `(trace_id, occurred_at)` for analysis queries if needed

Migration approach:
- Add tables via migrations (no rewriting of existing event rows).
- Trace meta can be computed on read; optional cached rows in `traces` are acceptable as additive writes.

### Lineage reconstruction semantics

Define a stable lineage graph reconstruction:
- For a given traceId, find its root by following `trace_derivations.child_trace_id → parent_trace_id`.
- Build the subtree of derived traces via `parent_trace_id` edges.
- Present a deterministic node ordering by `(trace_derivations.created_at, child_trace_id)`.

### Fork semantics (data-level)

Fork endpoint behavior:
1) validate fork request via contracts (`TraceForkRequest`)
2) verify `forkFromSpanId` exists in base trace
3) create a new trace id
4) copy base events up to and including `forkFromSpanId` into the new trace by reusing `spanId` values and changing only `traceId` (and applying overrides at the fork point)
5) append a system `note` event describing derivation
6) append a row to `trace_derivations` linking child → parent, recording fork metadata

The parent trace is never modified.

### Diff strategy (lineage-aware)

Phase 2 diff is optimized for lineage-related comparisons:

- If one trace is an ancestor of the other, align by the shared prefix (same `spanId` values for copied events) and diff the suffix.
- If traces are siblings, align on their common ancestor + fork point and diff their respective suffixes.
- For suffix diff, use a deterministic sequence diff (Myers) over stable event keys, and only compute payload-level differences when keys match.

Output shape evolves additively (keep Phase 1 `TraceDiffResult.changed[]` compatible while adding divergence metadata).

### Loop detection heuristics

Implement deterministic heuristics that produce `LoopWarning`-like entries inside `TraceAnalysis.loops[]`:

- Repeated sequences: repeated windows of stable event keys (size 2–5) that repeat consecutively.
- Recursive tool usage: repeated tool call patterns for the same tool with equivalent normalized input signature.
- Multi-agent handoff cycles: cycles in the handoff graph plus repeated handoff edge sequences.

All heuristics must output a stable list ordered deterministically (e.g., by first span occurrence).

### Multi-agent execution trees

Execution trees are derived from:
- `TraceEvent.actor` for agent attribution
- `handoff` events for agent-to-agent transfer edges

No framework-specific semantics are introduced at the contracts layer.

### UI: replay timeline + lineage navigation

Phase 2 UI enhancements remain within the existing web UI:
- lineage panel: breadcrumb (root → current) and sibling branch list
- fork point highlighting when viewing a derived trace
- diff overlay: divergence jump + changed nodes highlight
- loop warnings surfaced as navigable highlights (jump to first span of warning)

## Testing Strategy

Minimum required suites (Principle V):

- `packages/contracts`:
  - schema parsing tests for new lineage/diff additions
  - backward-compatibility tests where fields are additive

- `apps/collector`:
  - SQLite migration tests (tables exist, no destructive migration)
  - fork tests: parent unchanged, child created, lineage row appended, override applied deterministically
  - lineage tests: acyclic enforcement and deterministic ordering
  - diff tests: deterministic outputs on fixtures (including siblings and ancestor/descendant)
  - loop analysis tests: deterministic warnings on fixtures (repeats, tool recursion, handoff cycle)

- `apps/web`:
  - fixture-based tests for: lineage navigation rendering, divergence jump behavior, and loop highlight mapping

## Phased Rollout Strategy (Phase 2)

1) Contracts-first evolution
- add lineage graph, fork request/response, diff evolution fields, loop warning enrichment

2) Collector storage + endpoints
- migrate SQLite with additive tables
- implement `/analysis`, `/fork`, `/diff`, `/lineage` endpoints with contract validation

3) Web UI flows
- lineage navigation panel
- branch-aware replay timeline enhancements
- diff and loop overlays

Exit criteria:
- Forking is append-only and parent traces remain immutable.
- Lineage graph is acyclic and deterministically reconstructed.
- Diff and loop analysis are deterministic and covered by tests.
- Phase 1 playback ordering guarantees remain intact.

## Schema Governance

- All new API shapes and fields are defined in `@afr/contracts`.
- Prefer additive changes; any breaking change requires migration/compatibility plan and tests.

## Post-Design Constitution Re-check

After Phase 0 research and Phase 1 design artifacts (research/data-model/contracts/quickstart): PASS.

No constitution violations are required for this plan.
