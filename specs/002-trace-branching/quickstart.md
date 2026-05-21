# Phase 2 Quickstart: Fork, Lineage, Diff & Analysis

This quickstart walks through the Phase 2 capabilities using the local collector.

## Prerequisites

Collector running locally:

```sh
npm run dev -w apps/collector   # starts on http://localhost:4317
```

## Step 1: Emit a base trace

```sh
npx tsx apps/demo/src/demo.ts
```

Note the `traceId` output.

## Step 2: Fork the trace

```sh
# Replace <traceId> and <spanId> with values from your trace
curl -X POST http://localhost:4317/v1/traces/<traceId>/fork \
  -H 'content-type: application/json' \
  -d '{"forkFromSpanId":"<spanId>","overrides":{"promptText":"Alternative prompt"}}'
# → {"traceId":"t_<childId>"}
```

## Step 3: Verify lineage

```sh
curl http://localhost:4317/v1/traces/<traceId>/lineage
# → {"rootTraceId":"<traceId>","nodes":[...],"edges":[...]}
```

The parent trace is unchanged; the child trace is linked via a derivation edge.

## Step 4: Diff two traces

```sh
curl http://localhost:4317/v1/traces/<traceId>/diff/<childTraceId>
# → {"a":{...},"b":{...},"divergence":{...},"changed":[...]}
```

## Step 5: Loop analysis

```sh
curl http://localhost:4317/v1/traces/<traceId>/analysis
# → {"loops":[...],"failures":[...],"stats":{"eventCount":N,"actorCount":N}}
```

## Step 6: Full Phase 2 smoke demo

```sh
# Start the collector first, then:
npx tsx apps/demo/src/phase2-demo.ts
```

This script emits a base trace, forks it, fetches lineage, diffs, and analyzes in one shot.

## Web UI

Open http://localhost:5173 in your browser.

- **Lineage panel**: Breadcrumb, siblings, and Derived From display.
- **Compare with**: Select a related branch and click **Diff** to highlight changed spans.
- **Loop Warnings**: Auto-detected warnings appear in the sidebar with severity badges.
- **Jump to fork / Jump to first loop**: Playback cursor navigation.

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/v1/events` | POST | Ingest one or more trace events |
| `/v1/traces` | GET | List all traces |
| `/v1/traces/:id` | GET | Get trace with events + meta |
| `/v1/traces/:id/fork` | POST | Fork a trace at a span |
| `/v1/traces/:id/lineage` | GET | Get lineage graph |
| `/v1/traces/:aId/diff/:bId` | GET | Diff two traces (lineage-aware) |
| `/v1/traces/:id/analysis` | GET | Loop + failure analysis |
