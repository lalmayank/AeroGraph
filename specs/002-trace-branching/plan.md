# Implementation Plan: Agent Flight Recorder — Phase 2 & 2.5

**Branch**: `002-trace-branching` | **Date**: 2026-05-24 | **Spec**: [specs/002-trace-branching/spec.md](file:///c:/Users/siana/Desktop/Sian/Sian/OpenSource/agentdev/specs/002-trace-branching/spec.md)

**Input**: Feature specification from `specs/002-trace-branching/spec.md`

## Summary

This plan extends Phase 2 (Branching & Lineage) with Phase 2.5 advanced observability capabilities: capturing LangGraph state transitions, LCEL streaming metrics, RAG payloads, and human checkpoint events. The goal is to provide deep trace observability while maintaining strict replayability, deterministic reconstruction, and schema governance using append-only SQLite storage.

## Technical Context

**Language/Version**: TypeScript 5.6+

**Primary Dependencies**: `@langchain/core`, `langchain` (for adapters), SQLite (collector)

**Storage**: SQLite (via `@afr/contracts` and `apps/collector`)

**Testing**: Vitest

**Target Platform**: Node.js (collector, sdk, adapters), Browser (web UI)

**Project Type**: Monorepo (SDK, adapters, collector service, Web app)

**Performance Goals**: <5ms overhead for LCEL streaming telemetry, non-blocking state capture

**Constraints**: Append-only local storage, deterministic reconstruction, MUST be replay-safe

**Scale/Scope**: Local developer tool, up to 2,000 steps per trace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Event schema is the source of truth (schema drives contracts/types/storage/UI). **[Pass]** - We will define the new state, streaming, RAG, and checkpoint schemas in `@afr/contracts` first.
- No UI logic bypasses shared contracts. **[Pass]** - The web UI will query normalized events using the shared SDK/contracts.
- Adapters emit normalized trace events with a deterministic mapping. **[Pass]** - LangChain adapter will map internal streaming/state events to the new schemas.
- Implementation preserves trace replayability (no silent data loss). **[Pass]** - State snapshots and branch lineage are append-only.
- Tests are included and required for schema, adapters, and replay behavior. **[Pass]** - Vitest will cover adapters and schema validity.
- Unclear requirements are marked NEEDS CLARIFICATION (do not invent APIs). **[Pass]**

## Project Structure

### Documentation (this feature)

```text
specs/002-trace-branching/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Monorepo Workspace
packages/
├── contracts/           # Shared schemas and typings
│   ├── src/schema/      # SQLite schemas and zod types
│   └── src/types/       # Common TS interfaces
├── sdk/                 # Client library for interacting with collector
└── adapter-langchain/   # Langchain callback handlers
    ├── src/             # Implementation of handlers for streaming, LangGraph, RAG
    └── tests/

apps/
├── collector/           # SQLite backend service
└── web/                 # UI dashboard
```

**Structure Decision**: The implementation will span `@afr/contracts` for schema additions, `@afr/adapter-langchain` for capturing the new LangGraph/streaming/RAG/Checkpoint events, `apps/collector` to ensure safe SQLite persistence, and `apps/web` to render the detailed inspector views.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
