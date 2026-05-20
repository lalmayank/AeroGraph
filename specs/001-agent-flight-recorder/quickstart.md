# Quickstart — Agent Flight Recorder

This is a developer-first local workflow quickstart.

## Prereqs

- Node.js (LTS)
- `npm`

## Install

- `npm install`

## Run (local)

1) Start the collector:
- `npm run dev -w apps/collector`

2) Start the web UI:
- `npm run dev -w apps/web`

3) (Optional) Emit a demo trace:
- `npm run dev -w apps/demo`

## Verify

- Collector health: `GET http://localhost:4317/health`
- Trace list: `GET http://localhost:4317/v1/traces`

## Notes

- In Phase 1 MVP, persistence is targeted to SQLite (see data-model.md). The repo may also support a JSONL fallback for local development.
- All event payloads and API shapes must stay aligned with `packages/contracts` (constitution Principles I–II).
