# Schema Exporter & Artifact Governance (Feature 003)

## Purpose

Introduce a dedicated workspace package:

- `packages/schema-exporter`

Responsibilities:

- export JSON Schema artifacts from canonical Zod contracts (`@aerograph/contracts`)
- version outputs by runtime `schemaVersion`
- enable generation/validation of language bindings (Python now; others later)
- provide CI enforcement to prevent drift

This package is *build/CI tooling* and is not required by Python users.

## Inputs

- `@aerograph/contracts` Zod schemas:
  - `traceEventSchema` (and related `trace*Schema` objects)

## Outputs

- Versioned JSON Schema files (see [event-schema.md](event-schema.md))
- A small manifest file (recommended) capturing:
  - exported `schemaVersion`
  - exporter package version
  - source `@aerograph/contracts` version
  - generation timestamp

## Generation strategy

- Export must run in CI and locally via a single command (e.g., `npm run export:schema -w packages/schema-exporter`).
- CI must fail if generated artifacts differ from what is committed.
- Generator versions must be pinned to avoid churn.

## Drift prevention rules

CI MUST fail when:

1. Canonical Zod contracts change but artifacts are not regenerated.
2. Artifacts change but generated Python models are not regenerated.
3. A schema change is non-additive without a `schemaVersion` bump and explicit migration notes.

## Future language bindings

The exporter must be designed to support additional consumers without changing canonical contracts:

- additional JSON Schema exports (as needed)
- future codegen steps for other languages (out of scope for Feature 003)
