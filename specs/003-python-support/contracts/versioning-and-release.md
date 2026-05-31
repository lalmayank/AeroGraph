# Versioning & Release Alignment (Feature 003)

## Goals

- Keep npm and PyPI packages aligned to reduce confusion.
- Version schema artifacts by runtime `schemaVersion` (event contract compatibility).
- Enforce additive-only schema evolution unless `schemaVersion` changes.

## Package version alignment

- npm:
  - `@aerograph/contracts` (canonical)
  - `@aerograph/sdk`
  - `@aerograph/adapter-langchain`
  - `@aerograph/schema-exporter` (planned; may be private)

- PyPI:
  - `aerograph-sdk`
  - `aerograph-langchain`

Decision:

- Python package versions MUST track the corresponding npm package versions (e.g. `0.1.0` ↔ `0.1.0`).
- If Python releases must be decoupled for operational reasons, the plan must define a clear mapping, but the default is lockstep.

## Schema artifact versioning

- Artifact version is keyed by `schemaVersion` (currently `1.0.0`).
- Artifact generation must record:
  - `schemaVersion`
  - source `@aerograph/contracts` version
  - generator tool versions

## Backward compatibility

- Additive schema changes:
  - allowed without changing `schemaVersion`
  - must update JSON Schema artifacts and generated Python models

- Breaking schema changes:
  - require a new `schemaVersion`
  - require explicit migration/compatibility tests
  - must not invalidate existing stored traces (collector storage remains append-only)

## Deprecation

- Deprecations are documented in contracts and release notes.
- Deprecations must remain supported for at least one minor release cycle (exact policy finalized in tasks phase).
