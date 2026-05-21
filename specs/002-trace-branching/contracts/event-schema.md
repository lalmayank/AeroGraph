# Contract: Phase 2 Schema & Analysis Shapes

Source of truth: `packages/contracts`.

Phase 2 is an additive evolution of Phase 1 contracts.

## Goals

- Represent derived traces and lineage navigation without mutating historical traces.
- Expand diff and loop analysis outputs while keeping them deterministic and testable.
- Keep multi-agent execution trees representable using existing `actor` and `handoff` event semantics.

## Existing (Phase 1) foundation

- `TraceEvent` is a discriminated union by `kind`.
- `TraceMeta.derivedFrom` captures a derived trace’s parent trace and fork point.
- `TraceAnalysis` provides `loops[]` and `failures[]`.
- `TraceDiffResult` provides a deterministic baseline diff format.

## Phase 2 additive changes (planned)

### Lineage graph contract

Add a lineage graph response type:
- nodes are `TraceMeta`
- edges are derivations (parent → child) with fork metadata

### Diff contract evolution

Add optional fields to `TraceDiffResult` to support:
- explicit divergence point
- stable matching metadata for aligned steps

Phase 2 diff remains a pure function of two traces.

### Loop warnings

Evolve `TraceAnalysis.loops[]` entries to include:
- `kind` (repeated_sequence | recursive_tool | handoff_cycle)
- `severity` (low | medium | high)

These fields are additive and preserve existing `reason` + `spanIds`.

## Invariants

- Schema changes are versioned and require cross-layer updates.
- No consumer may add ad-hoc top-level fields outside the schema.
- Deterministic reconstruction: given the same stored data, lineage, diff, and loop warnings are stable.
