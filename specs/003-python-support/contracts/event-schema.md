# Event Schema & Exports (Feature 003)

## Canonical Source of Truth

- Canonical schema: `@aerograph/contracts` Zod schemas (ADR 0002)
- Collector ingestion validates using `validateTraceEvent` and stores append-only (ADR 0004)
- UI and analysis logic depend on the same canonical shapes

Feature 003 does **not** change the canonical contract strategy. It adds a language-neutral export so non-TypeScript runtimes can remain contract-compatible.

## Exported Artifacts (Derived)

### What is exported

`packages/schema-exporter` will export JSON Schema for the following canonical shapes:

- `TraceEvent` (discriminated union on `kind`)
- `Trace`
- `TraceMeta`
- `TraceWithMeta`
- API payloads consumed by SDKs/adapters where applicable (e.g., fork/lineage/diff/analysis response schemas)

### Artifact location and naming

- Artifacts MUST be versioned by `schemaVersion` (the runtime event schema version, e.g. `1.0.0`).
- Recommended structure (exact path finalized in tasks phase):

```text
packages/schema-exporter/artifacts/
└── schemaVersion=1.0.0/
    ├── TraceEvent.schema.json
    ├── Trace.schema.json
    ├── TraceMeta.schema.json
    ├── TraceWithMeta.schema.json
    └── api/
        ├── TraceForkRequest.schema.json
        ├── TraceForkResponse.schema.json
        ├── TraceLineageGraph.schema.json
        ├── TraceDiffResult.schema.json
        └── TraceAnalysis.schema.json
```

### Stability expectations

- Exports must be deterministic (stable ordering of JSON Schema output) so drift checks are reliable.
- Schema changes remain additive only; any breaking change must be represented as a new `schemaVersion` with a compatibility/migration plan.

## Consumer Rule

- Python SDK/adapters MUST validate events against the exported schema via generated Pydantic models.
- Python MUST emit the same event JSON shapes as TypeScript so collector/UI behavior remains unchanged.
