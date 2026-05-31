# Research: Feature 003 — Python SDK & Multi-Language Contract Support

This document records the concrete technical decisions required to plan Feature 003 without unresolved clarifications.

## Decisions

### 1) Language-neutral schema artifact: JSON Schema exported from Zod

- Decision: Add `packages/schema-exporter` (Node-only) to export JSON Schema artifacts from `@aerograph/contracts` Zod schemas.
- Rationale: Keeps contracts canonical in one place (ADR 0002) while enabling multi-language bindings.
- Alternatives considered:
  - Protobuf/Smithy/Avro: stronger IDL, but would require a multi-step migration and/or dual sources of truth.
  - Python-first schemas (Pydantic as truth): violates "contracts as source of truth" for the TypeScript ecosystem.

### 2) Versioning strategy

- Decision: Version JSON Schema artifacts by the event-level `schemaVersion` (currently `1.0.0`) and treat schema evolution as additive only.
- Rationale: `schemaVersion` is the runtime compatibility knob for stored traces; package versions can move faster without implying a contract break.
- Alternatives considered:
  - Version artifacts by npm package version: does not directly encode runtime compatibility of stored data.

### 3) Python contract models: pre-generated Pydantic v2 code

- Decision: Generate Python Pydantic v2 models from the exported JSON Schema in CI and ship the generated Python code inside PyPI distributions.
- Rationale: Python users must not need Node.js or generation scripts at install time; local validation must be available.
- Alternatives considered:
  - Runtime JSON Schema validation only (`jsonschema`): simpler, but loses the ergonomics of typed models and increases runtime schema wiring.
  - Manual Pydantic duplication: guaranteed drift over time.

### 4) Python HTTP transport

- Decision: Use `httpx` for both sync and async emission.
- Rationale: One dependency supports both styles with consistent APIs and good timeout/retry primitives.
- Alternatives considered:
  - `requests` + `aiohttp`: two stacks and duplicated behavior.

### 5) ID generation helpers

- Decision: Generate IDs with TypeScript-compatible prefixes (`t_` for trace, `s_` for span) and URL-safe random identifiers using Python `secrets`.
- Rationale: Preserves semantics and user expectations while keeping Python implementation dependency-light.
- Alternatives considered:
  - UUIDs: fine technically, but changes the look/feel and may complicate parity testing snapshots.

### 6) Deterministic ordering parity

- Decision: When ordering is required (batching/flush queues), follow the contract ordering comparator: `occurredAt` (lexicographic) → `spanId` → `kind`.
- Rationale: Matches `compareTraceEvents` in `@aerograph/contracts`.

### 7) Cross-language deterministic hashing: match current TypeScript implementation

- Decision: Python hashing MUST byte-match the current `getDeterministicStateHash` behavior in `@aerograph/contracts`:
  - recursively sort object keys (ascending)
  - `JSON.stringify` the sorted object (no whitespace)
  - compute 32-bit FNV-1a over JavaScript UTF-16 code units (`charCodeAt` iteration)
  - output lowercase hex, 8 chars, zero-padded
- Rationale: Backward compatibility with stored traces and existing UI/analysis assumptions.
- Alternatives considered:
  - SHA-256 / xxHash: stronger/faster, but would break compatibility unless versioned and migrated.

### 8) Non-finite numbers and non-JSON-native values in hashing

- Decision: Canonicalize values to match JavaScript `JSON.stringify` semantics for hashing:
  - `NaN`, `Infinity`, `-Infinity` → `null`
  - unsupported values (e.g., Python `bytes`, `datetime`, custom objects) MUST be rejected or normalized by the adapter *before* hashing; the SDK’s hashing helper will operate on JSON-compatible values only.
- Rationale: Avoids silent divergence between runtimes.

### 9) CI governance: fail on drift

- Decision: Add CI checks that fail when:
  - JSON Schema artifacts are stale relative to canonical Zod contracts
  - generated Python Pydantic models are stale relative to the JSON Schema artifacts
  - cross-language hashing fixtures diverge
  - cross-language event fixtures fail validation or collector ingestion
- Rationale: Prevents gradual contract drift and protects replay safety.

## Confirmed Current Behavior (ground truth from repo)

- Event ordering comparator: `occurredAt` → `spanId` → `kind` (in `@aerograph/contracts`).
- State hashing: sorted keys + `JSON.stringify` + 32-bit FNV-1a over `charCodeAt` code units (in `@aerograph/contracts`).
- Collector ingestion: accepts single event or array via `POST /v1/events`, validates with `validateTraceEvent`, and appends to SQLite (append-only).

## Key Risks / Watchouts

- JSON number formatting differences: Python `json.dumps` and JS `JSON.stringify` are close but not guaranteed identical for all floating-point edge cases; fixtures must cover tricky values.
- JSON Schema → Pydantic generation stability: generated code can churn with generator upgrades; pin versions in CI and treat generator output as an artifact.
- LangChain callback variability across versions: adapter must be pinned to supported `langchain`/`langchain-core` major versions and tested against known callback event sequences.
