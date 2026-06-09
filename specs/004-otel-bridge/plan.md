# Implementation Plan: Feature 004 — OpenTelemetry Bridge

**Branch**: `004-otel-bridge` | **Date**: 2026-06-09 | **Spec**: [specs/004-otel-bridge/spec.md](specs/004-otel-bridge/spec.md)

**Input**: Feature specification from `specs/004-otel-bridge/spec.md`

---

## Summary

Feature 004 introduces first-class OpenTelemetry interoperability to AeroGraph without replacing or augmenting the canonical contracts. AeroGraph remains the authoritative agent observability format. OpenTelemetry is strictly an **interoperability protocol**: a translation layer in, and a translation layer out.

The feature delivers:
1. **`@aerograph/otel`** — TypeScript package with export (AeroGraph → OTLP), import (OTel → AeroGraph), semantic mapping, and Zod-validated OTLP schemas
2. **`aerograph-otel`** — Python package with identical semantics, tested for cross-language parity
3. **Collector extension** — an optional, additive `POST /v1/otlp/traces` endpoint that ingests OTLP spans into the existing append-only SQLite store via the import bridge
4. **Shared fixture suite** — 10 canonical event fixtures + expected OTLP outputs enabling deterministic parity tests across both language implementations

All constitution requirements are satisfied: contracts remain canonical, storage remains append-only, traces remain replay-safe, schema evolution remains additive, no new infrastructure is introduced.

---

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js >= 18.18 (existing); Python >= 3.10 (existing from Feature 003)

**Primary Dependencies**:
- TypeScript new: `zod` (already a dep via contracts), zero new runtime deps for `@aerograph/otel`
- Python new: `aerograph-sdk` (existing), zero new runtime deps for `aerograph-otel`
- Optional: `@opentelemetry/api` as a **dev dependency** only (for type references in tests)

**Storage**: No change — SQLite collector store, append-only

**Testing**: Vitest (TypeScript) + pytest (Python) + shared JSON golden fixtures

**Target Platform**: Same as existing — local developer tooling, library packages for npm and PyPI

**Project Type**: npm workspaces monorepo (new package `packages/otel`) + Python package (`python/aerograph-otel`)

**Performance Goals**: Export/import conversion < 1ms per event; no network I/O in the bridge packages themselves

**Constraints** (from constitution):
- Contracts in `@aerograph/contracts` remain the sole source of truth
- `@aerograph/otel` is a consumer of contracts, never a definer — no new fields added to TraceEvent
- Append-only persistence guaranteed — the new OTLP endpoint writes via `store.appendEvent()` only
- No distributed infrastructure, no new databases, no replay mutation
- Strict package boundaries — bridge packages depend on contracts, not vice versa
- Additive schema evolution — existing `POST /v1/events` route unchanged

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Event Schema Is Source of Truth | `@aerograph/otel` consumes `TraceEvent` from contracts, never defines or extends it | ✅ Pass |
| II. Shared Contracts (No Bypasses) | All ingested OTLP spans are validated as `TraceEvent` via `validateTraceEvent()` before storage | ✅ Pass |
| III. Trace Replayability | Imported spans preserve traceId, spanId, parentSpanId, occurredAt, links — topology fully reconstructible | ✅ Pass |
| IV. Adapter Normalization | Semantic mapping is deterministic: same OTLP input → same TraceEvent output, always | ✅ Pass |
| V. Tests Are Mandatory | Mapping tests, round-trip tests, parity tests, collector integration tests all required | ✅ Pass |
| Arch: Modular Boundaries | `@aerograph/otel` depends on contracts; collector depends on `@aerograph/otel`; never reversed | ✅ Pass |
| Arch: Storage Must Not Invalidate Replayability | OTLP endpoint uses `store.appendEvent()` — same path as existing events, same guarantees | ✅ Pass |
| Workflow: Do Not Invent APIs | OTLP endpoint is a documented standard; no invented AeroGraph APIs | ✅ Pass |

**Post-Design Re-check** (after Phase 1):
- OTel bridge never becomes a second source of truth: ✅ (it reads from and writes to existing contracts only)
- Schema exporter remains authoritative: ✅ (no new schemas exported; OTel schema is validated but not exported)
- Generated artifacts remain deterministic: ✅ (semantic mapping is deterministic by design; parity tests enforce this)

---

## Project Structure

### Documentation (this feature)

```text
specs/004-otel-bridge/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: OTel research, ID analysis, semantic mapping decisions
├── data-model.md        # Phase 1: OtlpSpan, OtlpExportRequest, attribute constants, timestamp conversion
├── quickstart.md        # Phase 1: End-to-end validation flows
├── contracts/
│   └── contracts.md     # Phase 1: API contracts for @aerograph/otel and aerograph-otel
├── fixtures/            # Phase 2.1: Shared golden fixture JSONs for parity tests
│   ├── prompt_event.json
│   ├── response_event.json
│   ├── ... (10 total, one per kind)
│   └── expected_otlp/
│       ├── prompt_span.json
│       └── ... (10 total)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/
├── contracts/                  # Unchanged — canonical Zod schemas
├── sdk/                        # Unchanged — TypeScript SDK
├── adapter-langchain/          # Unchanged — TypeScript LangChain adapter
├── schema-exporter/            # Unchanged — schema export pipeline
└── otel/                       # NEW: @aerograph/otel
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    └── src/
        ├── index.ts            # Public API: exportEventsToOtlp, importOtlpToEvents
        ├── constants.ts        # AEROGRAPH_ATTRS constants
        ├── otlp-schema.ts      # Zod schemas for OtlpExportRequest, OtlpSpan
        ├── export.ts           # AeroGraph TraceEvent → OtlpSpan
        ├── import.ts           # OtlpSpan → AeroGraph TraceEvent
        ├── mapping.ts          # SemanticMapper: event kind <-> span name/attrs
        ├── timestamp.ts        # isoToUnixNano, unixNanoToIso
        └── __tests__/
            ├── export.test.ts
            ├── import.test.ts
            ├── mapping.test.ts
            ├── roundtrip.test.ts
            └── parity.test.ts  # Against specs/004-otel-bridge/fixtures/

apps/
├── collector/
│   └── src/
│       ├── server.ts           # MODIFIED: add POST /v1/otlp/traces route
│       └── otel/               # NEW: collector-side OTLP bridge
│           ├── ingest.ts       # orchestrates validation + importOtlpToEvents + appendEvent
│           └── ingest.test.ts
└── web/                        # Unchanged

python/
├── aerograph-sdk/              # Unchanged
├── aerograph-langchain/        # Unchanged
└── aerograph-otel/             # NEW: aerograph-otel PyPI package
    ├── pyproject.toml
    └── src/
        └── aerograph_otel/
            ├── __init__.py     # Public API
            ├── constants.py    # AeroGraphAttrs class
            ├── export.py       # TraceEvent → OtlpSpan (dict)
            ├── import_.py      # OtlpSpan (dict) → TraceEvent
            ├── mapping.py      # Semantic mapping logic
            ├── timestamp.py    # iso_to_unix_nano, unix_nano_to_iso
            └── tests/
                ├── test_export.py
                ├── test_import.py
                ├── test_mapping.py
                ├── test_roundtrip.py
                └── test_parity.py  # Against specs/004-otel-bridge/fixtures/
```

**Structure Decision**: Strict package boundary maintained — `packages/otel` is a new npm workspace dependent on `@aerograph/contracts`. The collector's new route is isolated in `apps/collector/src/otel/ingest.ts`. Python package mirrors TS structure without any Node.js dependency.

---

## Phase 0: Research Summary (Completed)

See [research.md](research.md) for full findings. Key decisions:

1. **ID Format**: AeroGraph IDs (`traceId` = 32-char hex, `spanId` = 16-char hex) are already valid OTLP IDs. **No format translation required.**
2. **Timestamp Strategy**: `occurredAt` → `startTimeUnixNano` for export. `startTimeUnixNano` → `occurredAt` for import. Synthetic 1ms duration for point-in-time events on export.
3. **Semantic Mapping**: Use `aerograph.kind` attribute as lossless round-trip marker. When absent on import, apply heuristic mapping based on `gen_ai.*` conventions and span name.
4. **Attribute Namespace**: All custom attributes use `aerograph.*` prefix. Never collide with official `gen_ai.*` conventions.
5. **Collector**: New additive endpoint `POST /v1/otlp/traces`. Zero changes to existing routes.
6. **No Runtime OTel SDK Dependency**: Bridge operates on plain OTLP JSON dicts.

---

## Phase 1: Design & Contracts (Completed)

See [data-model.md](data-model.md), [contracts/contracts.md](contracts/contracts.md), and [quickstart.md](quickstart.md).

Key design outputs:
- `OtlpSpan`, `OtlpExportRequest`, `MappingContext`, `SemanticMapper` interfaces defined
- All 10 AeroGraph event kind → OTel span mappings specified
- Import heuristic mapping table specified with fallback to `note`
- Attribute constant tables defined for both TS and Python
- Timestamp conversion algorithms specified for both directions
- Collector route contract specified (additive)
- Parity fixture structure defined

---

## Phase 2: Implementation Phases

### Phase 2.1 — Shared Fixtures

**Goal**: Hand-craft canonical golden fixture files for parity testing.

**Deliverables**:
- `specs/004-otel-bridge/fixtures/{kind}_event.json` — 10 canonical AeroGraph TraceEvent JSONs (all pass `validateTraceEvent()`)
- `specs/004-otel-bridge/fixtures/expected_otlp/{kind}_span.json` — 10 expected OTLP span outputs

**Rules**: Fixtures are created by hand per the semantic mapping table in data-model.md. They are ground truth — never auto-generated.

---

### Phase 2.2 — TypeScript Package: `@aerograph/otel`

**Scope**: Complete standalone package with all bridge logic.

**Files to create** (all under `packages/otel/src/`):

| File | Responsibility |
|---|---|
| `constants.ts` | `AEROGRAPH_ATTRS` object with all attribute key string constants |
| `otlp-schema.ts` | Zod schemas: `otlpSpanSchema`, `otlpExportRequestSchema`, exported types |
| `timestamp.ts` | `isoToUnixNano(iso: string): string`, `unixNanoToIso(nano: string): string` |
| `mapping.ts` | `getSpanNameForKind`, `getSpanKindInt`, `buildAttributesFromEvent`, `resolveAeroGraphKind` |
| `export.ts` | `exportEventToOtlpSpan`, `exportLinksToOtlp`, `exportEventsToOtlp` |
| `import.ts` | `importOtlpSpanToEvent`, `extractAttributeValue`, `importOtlpToEvents` |
| `index.ts` | Public re-exports |

**Tests** (`src/__tests__/`):

| Test File | Coverage |
|---|---|
| `export.test.ts` | `exportEventToOtlpSpan` for all 10 event kinds; link conversion |
| `import.test.ts` | Lossless round-trip path (aerograph.kind present); heuristic paths |
| `mapping.test.ts` | All span name and kind integer mappings; attribute building |
| `roundtrip.test.ts` | Full round-trip for all 10 kinds: topology fields preserved |
| `parity.test.ts` | Load fixtures from `specs/004-otel-bridge/fixtures/`; assert export matches `expected_otlp/` exactly |

**Package scaffold**:
- `package.json`: `name: "@aerograph/otel"`, peer dep on `@aerograph/contracts@^0.2.0`, dep on `zod`
- Root `package.json`: Add `@aerograph/otel` to build and test commands

---

### Phase 2.3 — Python Package: `aerograph-otel`

**Scope**: Mirrors TS implementation exactly in Python.

**Files to create** (under `python/aerograph-otel/src/aerograph_otel/`):

| File | Responsibility |
|---|---|
| `constants.py` | `AeroGraphAttrs` class with identical attribute key constants |
| `timestamp.py` | `iso_to_unix_nano(iso: str) -> str`, `unix_nano_to_iso(nano: str) -> str` |
| `mapping.py` | Mirror of TS mapping functions |
| `export.py` | Mirror of TS export functions |
| `import_.py` | Mirror of TS import functions |
| `__init__.py` | Public API re-exports |

**Tests** mirror TS test suite; `test_parity.py` reads the same fixture files.

**Package scaffold**:
- `pyproject.toml`: `name = "aerograph-otel"`, dep on `aerograph-sdk`

---

### Phase 2.4 — Collector Integration

**Scope**: Additive changes to the collector.

**Files**:

| File | Change |
|---|---|
| `apps/collector/src/otel/ingest.ts` | NEW: `createOtlpIngestHandler(store)` express request handler |
| `apps/collector/src/otel/ingest.test.ts` | NEW: integration tests |
| `apps/collector/src/server.ts` | MODIFIED: add `app.post('/v1/otlp/traces', ...)` (2 lines) |
| `apps/collector/package.json` | MODIFIED: add `@aerograph/otel` workspace dep |

**Ingest handler logic**:
1. `otlpExportRequestSchema.parse(req.body)` — validate or return 400
2. `importOtlpToEvents(body)` — convert spans to TraceEvents
3. `events.map(validateTraceEvent)` — validate against contracts or return 400
4. `events.forEach(store.appendEvent)` — append-only write
5. Return 201

---

### Phase 2.5 — CI Governance

**Steps**:
1. Add `npm run build -w @aerograph/otel` and `npm run test -w @aerograph/otel` to root CI scripts
2. Add `cd python/aerograph-otel && pytest` to Python CI step
3. Verify `npm run schema:check` still passes (schema drift gate)
4. Update root `README.md` with `@aerograph/otel` and `aerograph-otel` documentation

---

## Verification Plan

### Automated Tests

```bash
# Build
npm run build -w @aerograph/contracts -w @aerograph/otel

# TypeScript bridge tests
npm run test -w @aerograph/otel

# Python bridge tests
cd python/aerograph-otel && pytest

# Collector integration tests
npm run test -w apps/collector

# Schema drift gate
npm run schema:check

# Parity gate (explicit)
npm run test -w @aerograph/otel -- --grep "parity"
cd python/aerograph-otel && pytest -k "parity"
```

### Acceptance Criteria

- [ ] All 10 event kinds export to OTLP without error (TS and Python)
- [ ] All 10 event kinds import from OTLP without error; topology fields preserved
- [ ] TS and Python produce identical OTLP output for all 10 fixture kinds (parity)
- [ ] `POST /v1/otlp/traces` returns 201; ingested events retrievable via `GET /v1/traces/:id`
- [ ] `POST /v1/events` still returns 201 (no regression)
- [ ] `npm run schema:check` passes (no schema drift)
- [ ] All tests green in CI (TS + Python)
