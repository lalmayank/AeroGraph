# Phase 0 Research: Phase 2 — Trace Branching, Diff, Loop Detection

This document resolves Phase 2 design choices needed to plan implementation. All decisions preserve:
- append-only, replay-safe storage
- deterministic reconstruction from stored data
- strict contract governance via `@afr/contracts`
- local-first, monolithic architecture (SQLite is the source of truth)

## Decision 1: Lineage Storage Model (SQLite)

**Decision**: Introduce an append-only lineage table (`trace_derivations`) and an explicit trace metadata table (`traces`).

**Rationale**:
- The existing `events` table is append-only and ideal as the immutable event log.
- Forking and lineage are *trace-level* relationships; representing them as explicit rows avoids rescanning events on every list/lineage query.
- Append-only lineage rows support acyclic lineage invariants while avoiding updates to historical traces.

**Alternatives considered**:
- **Derive lineage by scanning `note` events only**: simpler schema but expensive for lineage queries and fragile if note events are missing.
- **Store lineage inside each event**: violates schema governance and duplicates data.

## Decision 2: Fork Semantics (Data-level fork)

**Decision**: Forking creates a *new trace* with a new `traceId` while copying a prefix of events up to the fork point. Span IDs are preserved (no rewriting); only `traceId` changes and optional overrides can modify the fork-point event.

**Rationale**:
- Preserving `spanId` values across parent/child traces makes diffs more accurate and cheaper (common prefix aligns naturally).
- The uniqueness constraint is `(trace_id, span_id)`, so reusing `spanId` across different traces is safe.
- Determinism improves because no random ID rewriting is required.

**Alternatives considered**:
- **Rewrite span IDs in forked traces**: works but increases diff noise and introduces extra complexity.

## Decision 3: Deterministic Reconstruction Guarantees

**Decision**: Define stable, deterministic ordering and reconstruction rules as pure functions of stored data:
- trace event playback order: stable sort by `(occurredAt, spanId, kind)`
- persistence order: `events.id` (SQLite autoincrement) remains the append-only ingestion sequence and is used only as an internal tie-breaker
- lineage reconstruction: stable ordering by `trace_derivations.created_at` then `child_trace_id`

**Rationale**:
- Maintains Phase 1 ordering guarantee and avoids introducing new required event fields.

**Alternatives considered**:
- **Add `ingestSeq` to the event schema**: improves cross-store ordering but is unnecessary for Phase 2 and increases contract surface.

## Decision 4: Diff Strategy for Up To 2k Steps

**Decision**: Use a lineage-aware diff algorithm:
1) detect common ancestry (parent/child or siblings) using `trace_derivations`
2) align the shared prefix up to the fork point by `spanId`
3) diff the post-fork suffix using a deterministic sequence diff (Myers) over stable per-event keys, with payload-hash comparison only for matched keys

**Rationale**:
- Typical case (forked branches) diverges after a known fork point; exploiting that keeps runtime low.
- Myers diff provides robust alignment when two branches diverge structurally.
- With 2,000 steps, Myers is feasible and deterministic.

**Alternatives considered**:
- **Order-aligned diff only**: fast but produces false positives when a branch adds/removes steps.
- **Full graph isomorphism diff**: too complex for Phase 2.

## Decision 5: Loop Detection Heuristics

**Decision**: Implement deterministic loop heuristics as a pure function of event logs:
- **Repeated sequences**: detect repeated windows of stable keys (size 2–5) that repeat consecutively $\ge 2$ times.
- **Recursive tool usage**: detect repeated tool calls to the same tool with equivalent normalized input signature above a threshold.
- **Multi-agent handoff cycles**: build a directed handoff graph and flag cycles; additionally flag repeated handoff edge sequences within a sliding window.

**Rationale**:
- Covers common failure modes without requiring probabilistic models.
- Produces actionable outputs (span sets + reason).

**Alternatives considered**:
- **LLM-based loop classification**: non-deterministic and not test-friendly.

## Decision 6: UI Replay Timeline + Lineage Navigation

**Decision**: Add a lineage panel and branch-aware playback controls:
- show lineage breadcrumb from root → current trace
- show sibling branches at the same parent
- when viewing a derived trace, highlight fork point and provide “jump to divergence” for diffs

**Rationale**:
- Makes Phase 2 features discoverable without adding new pages.

**Alternatives considered**:
- **Separate “lineage page”**: increases UX scope; Phase 2 keeps it in the existing UI.
