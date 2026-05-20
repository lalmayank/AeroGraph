# Contract: Collector HTTP API

Source of truth for payload shapes: `packages/contracts`.

Base URL (local): `http://localhost:4317`

## Health

- `GET /health` → `{ ok: true }`

## Ingest

- `POST /v1/events`
  - Body: a single `TraceEvent` or an array of `TraceEvent`
  - Validation: server validates using `validateTraceEvent` from `@afr/contracts`
  - Response: `204 No Content` on success

## Trace retrieval

- `GET /v1/traces` → `{ traces: TraceMeta[] }`
- `GET /v1/traces/:traceId` → `TraceWithMeta` (or `404`)

## Analysis

- `GET /v1/traces/:traceId/analysis` → `TraceAnalysis` (or `404`)

## Fork / Derive

- `POST /v1/traces/:traceId/fork`
  - Body: `{ forkFromSpanId: string, overrides?: { promptText?: string } }`
  - Response: `201 { traceId: string }`

## Diff

- `GET /v1/traces/:aId/diff/:bId` → `TraceDiffResult` (or `404`)

## Realtime (Phase 1 planning)

- Phase 1 may add an SSE endpoint (preferred) or polling guidance.
- Any new endpoint is a shared contract change and must be added via the contracts package (constitution Principle II).
