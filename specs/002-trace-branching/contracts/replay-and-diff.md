# Contract: Phase 2 Replay/Fork, Lineage, Diff, Loop Semantics

This contract describes deterministic semantics for fork/lineage/diff/loop detection.

## Fork (data-level)

- Fork creates a new trace derived from a parent trace.
- Fork selects a fork point (`forkFromSpanId`) in the parent trace.
- The derived trace includes a copy of all events up to and including the fork point.
- Derived trace metadata includes `derivedFrom` (parent trace id + fork point).
- The parent trace is never mutated.

Overrides:
- Overrides apply only to the fork point event (initially prompt-text override).
- Overrides are recorded as part of derivation metadata.

## Lineage invariants

- Each derived trace has exactly one parent.
- The lineage graph is acyclic.
- Lineage relationships are append-only (new edges may be added, existing edges are never rewritten).

## Diff

- Diff compares two traces in the same lineage.
- Diff is deterministic and pure: no dependency on wall-clock time or external services.
- Diff results identify:
  - divergence point
  - structural changes (added/removed steps)
  - content changes (payload deltas)

## Loop detection

Loop warnings are a deterministic function of the trace event sequence.

Heuristics include:
- repeated stable-key sequences
- recursive tool-call patterns
- multi-agent handoff cycles

Outputs:
- each warning includes a reason, severity, and the spanIds affected.
