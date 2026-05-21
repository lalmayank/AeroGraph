# Quickstart: Phase 2 — Branching, Diff, Loop Detection

This quickstart is for local development only (Phase 2 is local-first and monolithic).

## Prerequisites

- Node.js (LTS)
- npm

## Run the collector

From repo root:
- `npm -w apps/collector run dev`

Collector default base URL:
- `http://localhost:4317`

## Run the web UI

From repo root:
- `npm -w apps/web run dev`

## Emit a demo trace

From repo root:
- `npm -w apps/demo run dev`

Then open the web UI, select the latest trace, and verify:
- nodes render
- payload inspection works
- failures are highlighted

## Phase 2 endpoints (once implemented)

- Fork a trace from a span:
  - `POST /v1/traces/:traceId/fork`
- View lineage:
  - `GET /v1/traces/:traceId/lineage`
- Diff two related traces:
  - `GET /v1/traces/:aId/diff/:bId`
- Analyze loops/failures:
  - `GET /v1/traces/:traceId/analysis`

All request/response payloads are validated using `@afr/contracts`.
