# Implementation Plan: Feature 003 — Python SDK & Multi-Language Contract Support

**Branch**: `003-python-sdk` | **Date**: 2026-05-31 | **Spec**: [specs/003-python-support/spec.md](specs/003-python-support/spec.md)

**Input**: Feature specification from `specs/003-python-support/spec.md`

## Summary

This plan adds first-class Python support to AeroGraph while preserving the platform constitution and existing ADRs: shared contracts remain canonical, storage remains append-only SQLite, reconstruction stays deterministic and replay-safe, and schema evolution remains additive. The deliverables are (1) a native-feeling Python SDK equivalent to `@aerograph/sdk`, (2) a dedicated `packages/schema-exporter` workspace package that exports versioned JSON Schema artifacts from Zod contracts, (3) a LangChain Python adapter (with LangGraph support via LangChain integration) emitting identical TraceEvent JSON, and (4) governance via CI to prevent schema drift and ensure cross-language deterministic hashing parity.

## Technical Context

**Language/Version**: TypeScript 5.6+ (existing), Node.js >= 18.18 (existing), Python >= 3.10 (new)

**Primary Dependencies**:
- TypeScript: `zod` (canonical contracts), `nanoid` (existing SDK)
- Schema export: `zod-to-json-schema` (planned), Node-only (build/CI)
- Python SDK: `httpx` (sync + async HTTP), `pydantic` v2 (local validation), standard library `secrets`/`uuid`/`datetime`
- Python model generation (maintainers/CI only): `datamodel-code-generator` (Pydantic v2 output)
- Python adapter: `langchain`, `langchain-core` (planned), optional LangGraph support via LangChain callback surfaces

**Storage**: SQLite (collector) — no storage changes required for Feature 003

**Testing**: Vitest (existing) + pytest (new) + cross-language parity fixtures

**Target Platform**: Local developer tooling — Node.js services/UI plus Python applications emitting to the collector over HTTP

**Project Type**: npm workspaces monorepo + isolated Python packages under `python/` (published to PyPI)

**Performance Goals**: Keep Python emission overhead low (single-digit ms per event locally; batching recommended for high-volume streams)

**Constraints**:
- Contracts remain the source of truth (ADR 0002)
- Append-only event storage (ADR 0004)
- Deterministic reconstruction and replay-safe traces (constitution)
- Additive schema evolution only (no breaking contract changes)
- No distributed infrastructure, no orchestration, no runtime resume engines
- Package boundaries remain strict: Python code does not become a runtime dependency of Node packages and vice versa

**Scale/Scope**: Feature 003 delivers Python SDK + LangChain Python adapter only; CrewAI and AutoGen are architecture targets only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Event schema is the source of truth (schema drives contracts/types/storage/UI). **[Pass]** — Zod contracts remain canonical; JSON Schema artifacts are derived outputs.
- No UI logic bypasses shared contracts. **[Pass]** — UI continues to consume the same API responses validated by shared contracts.
- Adapters emit normalized trace events with a deterministic mapping. **[Pass]** — Python adapter design maps LangChain callbacks deterministically to canonical TraceEvent kinds.
- Implementation preserves trace replayability (no silent data loss). **[Pass]** — adapters encode framework specifics inside schema-approved payload maps; storage remains append-only.
- Tests are included and required for schema, adapters, and replay behavior. **[Pass]** — CI adds schema drift checks, parity fixtures, hashing parity tests, and collector integration tests.
- Unclear requirements are marked NEEDS CLARIFICATION (do not invent APIs). **[Pass]** — this plan does not introduce new collector endpoints; it uses existing ingestion/retrieval APIs.

## Project Structure

### Documentation (this feature)

```text
specs/003-python-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (not created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── contracts/                # Canonical Zod schemas + deterministic helpers (source of truth)
├── sdk/                      # TypeScript SDK (reference behavior)
├── adapter-langchain/        # TypeScript adapter (parity reference)
└── schema-exporter/          # NEW: export versioned JSON Schema from Zod (build/CI only)

apps/
├── collector/                # Express + SQLite ingestion/retrieval API
└── web/                      # React UI

python/                       # NEW: isolated Python distribution (no Node required for users)
├── aerograph-sdk/            # PyPI package: Python SDK + local validation + hashing
└── aerograph-langchain/      # PyPI package: LangChain callback adapter (depends on aerograph-sdk)
```

**Structure Decision**: Feature 003 is split across strict boundaries: `@aerograph/contracts` remains canonical; `packages/schema-exporter` derives JSON Schema artifacts used by Python; Python packages ship pre-generated Pydantic models and do not require Node.js at install/runtime; the collector and UI remain compatible and unchanged at the API boundary.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Implementation Status

*(Updated: 2026-05-31)*

**Phase 1 (Setup) & Phase 2 (Foundational):** **COMPLETED**
- Schema Exporter is fully operational and integrated with CI checks.
- Cross-language deterministic hashing and event ordering are implemented and verified against canonical fixtures.
- Python contract models (`generated.py`) are fully autogenerated via `datamodel-code-generator` from the JSON schema.
- Strict package boundaries are established with zero Node.js dependencies in the Python workspace.

**Phase 3 / User Story 1 (Python SDK):** **COMPLETED**
- `aerograph-sdk` implements 10 `TraceEvent` builders with Pydantic v2 validation.
- `FlightRecorder` provides synchronous and asynchronous emission, including batching and robust HTTP retries via `httpx`.
- Python-to-Collector integrations tests (`test_collector_smoke.py`) are scaffolded.
- Test coverage for hashing, model validation, and emitter behavior is fully passing.

**Phase 4 / User Story 2 (LangChain Adapter):** **PENDING**
- Directory and `pyproject.toml` are scaffolded for `aerograph-langchain`.
- Implementation of the `AeroGraphCallbackHandler` mapping LangChain signals to `aerograph_sdk` events is not yet started.
