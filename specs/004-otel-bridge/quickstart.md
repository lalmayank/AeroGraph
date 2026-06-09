# Quickstart Validation Guide: Feature 004 — OpenTelemetry Bridge

**Phase 1 Output** | **Branch**: `004-otel-bridge` | **Date**: 2026-06-09

---

## Purpose

This guide describes how to validate that the OTel bridge is correctly implemented end-to-end. It covers the two primary flows: AeroGraph → OTel export and OTel → AeroGraph import (via the collector).

---

## Prerequisites

- Node.js >= 18.18
- Python >= 3.10
- Collector running: `npm run dev -w apps/collector` (or `npm run dev -w apps/collector`)
- `@aerograph/otel` package built: `npm run build -w @aerograph/otel`
- `aerograph-otel` Python package installed: `pip install -e python/aerograph-otel`

---

## Flow 1: AeroGraph → OTel Export

### Step 1: Build the packages

```bash
npm run build -w @aerograph/contracts
npm run build -w @aerograph/otel
```

### Step 2: Run the TypeScript unit tests

```bash
npm run test -w @aerograph/otel
```

**Expected**: All 10 event kind tests pass. Export and round-trip tests pass.

### Step 3: Run the Python unit tests

```bash
cd python/aerograph-otel
pytest
```

**Expected**: All tests pass, including parity tests against golden fixtures.

### Step 4: Export a trace to OTLP manually (TypeScript)

Create a script `scripts/test-export.ts`:

```typescript
import { exportEventsToOtlp } from '@aerograph/otel';
import { validateTraceEvent } from '@aerograph/contracts';

const event = validateTraceEvent({
  schemaVersion: "1.0.0",
  traceId: "5b8efff798038103d269b633813fc60c",
  spanId: "eee19b7ec3c1b174",
  parentSpanId: null,
  occurredAt: "2026-06-09T18:00:00.000Z",
  actor: { kind: "agent", id: "my-agent", name: "My Agent" },
  kind: "prompt",
  status: "ok",
  links: [],
  payload: { text: "Hello, world!" }
});

const otlpRequest = exportEventsToOtlp([event], { serviceName: "my-agent" });
console.log(JSON.stringify(otlpRequest, null, 2));
```

**Expected output**: A valid OTLP/JSON `resourceSpans` structure with `aerograph.*` attributes and the event's topology fields.

---

## Flow 2: OTel → AeroGraph Import (Collector)

### Step 1: Start the collector

```bash
npm run dev -w apps/collector
```

### Step 2: Send an OTLP span to the collector's new endpoint

```bash
curl -X POST http://localhost:4317/v1/otlp/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{ "key": "service.name", "value": { "stringValue": "external-service" } }]
      },
      "scopeSpans": [{
        "scope": { "name": "my-instrumentation", "version": "1.0.0" },
        "spans": [{
          "traceId": "5b8efff798038103d269b633813fc60c",
          "spanId": "eee19b7ec3c1b174",
          "name": "gen_ai.chat",
          "kind": 3,
          "startTimeUnixNano": "1749485940000000000",
          "endTimeUnixNano": "1749485941000000000",
          "status": { "code": 1 },
          "attributes": [
            { "key": "gen_ai.operation.name", "value": { "stringValue": "chat" } },
            { "key": "gen_ai.request.model", "value": { "stringValue": "gpt-4o" } }
          ]
        }]
      }]
    }]
  }'
```

**Expected**: `201 Created`

### Step 3: Verify the event was ingested as an AeroGraph TraceEvent

```bash
curl http://localhost:4317/v1/traces/5b8efff798038103d269b633813fc60c
```

**Expected**: A trace containing the ingested span converted to an AeroGraph `note` (or `prompt`) event with `aerograph.otel_imported: true`.

---

## Flow 3: Round-Trip Verification

### Step 1: Run the round-trip test suite

```bash
npm run test -w @aerograph/otel -- --grep "round-trip"
```

**Expected**: All round-trip tests pass. For all 10 event kinds, `importOtlpSpanToEvent(exportEventToOtlpSpan(event))` reconstructs the original event with topology fields intact.

### Step 2: Run the parity test suite

```bash
# TypeScript
npm run test -w @aerograph/otel -- --grep "parity"

# Python
cd python/aerograph-otel && pytest -k "parity"
```

**Expected**: Both suites produce identical OTLP output for the same golden fixture inputs. No differences in attribute values, span structure, or link topology.

---

## Flow 4: Cross-System Trace Correlation

### Step 1: Send an AeroGraph event with a trace link to an external span

```typescript
import { FlightRecorder } from '@aerograph/sdk';

const recorder = new FlightRecorder({ 
  endpoint: 'http://localhost:4317',
  actor: { kind: 'agent', id: 'my-agent' }
});

// Link the root span to an external OTel span
const event = await recorder.prompt({
  text: "User query",
  links: [{
    rel: "follows",
    spanId: "eee19b7ec3c1b173"   // external OTel span ID
  }]
});
```

### Step 2: Export the AeroGraph trace and verify the link is preserved

```typescript
const otlpRequest = exportEventsToOtlp([event]);
// The OTel span's links[] must contain an entry pointing to eee19b7ec3c1b173
// with attribute aerograph.link.rel = "follows"
```

**Expected**: The OTLP span's `links` array contains one entry with `spanId: "eee19b7ec3c1b173"` and attribute `aerograph.link.rel = "follows"`.

---

## Validation Checklist

- [ ] `npm run test -w @aerograph/otel` passes (all event kinds)
- [ ] `pytest python/aerograph-otel` passes (all event kinds)
- [ ] Round-trip tests pass (topology-critical fields preserved)
- [ ] Parity tests pass (TS and Python produce identical OTLP for same input)
- [ ] Collector ingests OTLP spans via `POST /v1/otlp/traces` and returns 201
- [ ] Collector ingested events are retrievable via existing `GET /v1/traces/:id`
- [ ] Existing `POST /v1/events` route still works (no regression)
- [ ] Schema drift check still passes: `npm run schema:check`
- [ ] Cross-system trace links are preserved in exported OTLP spans
