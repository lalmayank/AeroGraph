# AeroGraph

An open-source flight recorder for AI agent workflows — local-first, append-only, and replay-safe.

## What it does

**Phase 1 — Core Tracing**
- Captures **prompts**, **responses**, **tool calls**, **agent handoffs**, and **errors** as normalized trace events
- Stores traces in a replay-safe, append-only SQLite store
- Visualizes traces as an interactive **trace graph** with payload inspection, failure highlighting, and playback timeline

**Phase 2 — Branching, Diff, and Loop Detection**
- **Fork traces**: create derived traces from any span (append-only, parent immutable)
- **Lineage navigation**: breadcrumb, sibling list, derivedFrom — navigate the branch tree in the UI
- **Deterministic diff**: compare two lineage-related traces with Myers diff; divergence highlighted on the graph
- **Loop detection**: automatically detects repeated sequences, recursive tool usage, and multi-agent handoff cycles

**Phase 2.5 — Advanced Observability**
- **LangGraph State Tracking**: Capture full LangGraph state snapshots at node transitions, track state evolution.
- **LCEL Streaming Telemetry**: Telemetry overlays for stream completion times, Time-to-First-Token (TTFT), and tokens-per-second metrics.
- **RAG Payload Inspection**: Explicit first-class support for viewing retrieval queries, source documents, and metadata scoring.
- **Human Checkpoints**: First-class handling of `interrupt` states and human-in-the-loop approvals.
- All outputs validated through shared contracts (`@afr/contracts`); no schema bypasses

## Repository structure

- `packages/contracts`: event schema + shared contracts (source of truth)
- `packages/sdk`: reference SDK for emitting normalized trace events
- `packages/adapter-langchain`: MVP adapter for LangChain workflows
- `apps/collector`: trace ingest + SQLite storage + lineage/diff/analysis endpoints
- `apps/web`: interactive trace graph UI with lineage panel, diff overlay, and loop warnings
- `apps/demo`: demo emitter + Phase 2 smoke demo

## Development

Requirements: Node.js (LTS)

```sh
npm install

# Start collector (http://localhost:4317):
npm run dev -w apps/collector

# Start web UI (http://localhost:5173):
npm run dev -w apps/web

# Run tests:
npm test

# Build:
npm run build
```

## Phase 2 Quick Start

```sh
# 1. Start collector
npm run dev -w apps/collector

# 2. Emit a demo trace
npx tsx apps/demo/src/demo.ts

# 3. Run the full Phase 2 smoke demo (fork → diff → analysis)
npx tsx apps/demo/src/phase2-demo.ts

# 4. Open UI
open http://localhost:5173
```

## Phase 2 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `POST /v1/events` | POST | Ingest trace events |
| `GET /v1/traces` | GET | List traces |
| `GET /v1/traces/:id` | GET | Get trace + meta |
| `POST /v1/traces/:id/fork` | POST | Fork a trace at a span |
| `GET /v1/traces/:id/lineage` | GET | Lineage graph |
| `GET /v1/traces/:aId/diff/:bId` | GET | Lineage-aware deterministic diff |
| `GET /v1/traces/:id/analysis` | GET | Loop warnings + failure analysis |

## Architecture

- **No distributed infrastructure**: no queues, no collectors, no Kubernetes — all local SQLite
- **Contract-first**: all API shapes defined in `@afr/contracts` (Zod); validated on every ingress/egress
- **Append-only**: events and lineage edges are never mutated; forking copies prefix events
- **Deterministic**: ordering, diff, and loop analysis produce the same result for the same input


## How This Project Is Split

This repository serves two different audiences:

- Contributors work in the monorepo and run the collector, web UI, demos, and tests locally.
- End users consume the reusable packages, usually `@afr/sdk` and `@afr/adapter-langchain`, from their own application.

That split is intentional. The repo contains the product, but the public integration surface is the SDK and adapters. The collector and web UI are the viewing and storage layer that can be run locally or hosted separately.

## Deployment Model

There are two supported ways to ship AFR:

- **Self-hosted**: users run the collector and web UI themselves, then point their app at the collector endpoint.
- **Hosted**: you run the collector and web UI as a service, and users only install the SDK or adapter in their own project.