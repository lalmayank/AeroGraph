# Contract: Phase 2 Collector HTTP API

Source of truth for payload shapes: `packages/contracts`.

Base URL (local): `http://localhost:4317`

## Health

- `GET /health` → `{ ok: true }`

## Ingest

- `POST /v1/events`
  - Body: a single `TraceEvent` or an array of `TraceEvent`
  - Response: `201 Created` on success

## Trace retrieval

- `GET /v1/traces` → `{ traces: TraceMeta[] }`
- `GET /v1/traces/:traceId` → `TraceWithMeta` (or `404`)

## Lineage

- `GET /v1/traces/:traceId/lineage` → `TraceLineageGraph` (or `404`)

## Fork / Derive

- `POST /v1/traces/:traceId/fork`
  - Body: `TraceForkRequest`
  - Response: `201 { traceId: string }`

## Analysis

- `GET /v1/traces/:traceId/analysis` → `TraceAnalysis` (or `404`)

## Diff

- `GET /v1/traces/:aId/diff/:bId` → `TraceDiffResult` (or `404`)

## Contract rules

- Endpoints must validate request and response bodies with `@afr/contracts`.
- New endpoints or fields require contract evolution; no UI/collector bypasses.
