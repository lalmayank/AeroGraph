# Contract: Replay/Fork and Diff Semantics

This document describes expected semantics for replay-safe reconstruction, forking, and diffing.

## Fork (data-level replay)

- Forking creates a new trace derived from a base trace.
- The fork operation:
  1) selects a fork point (`forkFromSpanId`) in the base trace
  2) copies all events up to and including that event
  3) rewrites `spanId`, `parentSpanId`, and `links[].spanId` to keep referential integrity inside the forked trace
  4) optionally applies input overrides (Phase 1: prompt text override)
  5) appends a system `note` event describing the derivation

Invariants:
- Forked trace contains no references to span IDs that don’t exist within that forked trace.
- Base trace is never mutated.

## Deterministic playback

- Playback order is based on event ordering semantics (timestamp + deterministic tie-break).
- UI playback is "reconstruction" (no execution), unless an explicit replay runtime exists.

## Diff

- Phase 1 diff is a deterministic baseline (order-aligned comparison).
- Phase 2 evolves to span-aware alignment (e.g., matching by stable keys or span lineage) to reduce false positives.

Invariants:
- Diff is a pure function of two event logs.
- Diff output must be stable given stable inputs.
