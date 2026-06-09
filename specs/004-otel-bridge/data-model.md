# Data Model: Feature 004 — OpenTelemetry Bridge

**Phase 1 Output** | **Branch**: `004-otel-bridge` | **Date**: 2026-06-09

---

## Overview

This document defines the data structures that the OTel bridge operates on. The bridge is a pure transformation layer — it neither stores data nor introduces new persistent models. All persistent data flows through existing AeroGraph `TraceEvent` types and the existing collector.

---

## 1. Core AeroGraph Entities (Existing, Unchanged)

The following are defined in [`@aerograph/contracts`](file:///c:/Users/siana/Desktop/Sian/Sian/OpenSource/agentdev/packages/contracts/src/index.ts) and **must not be modified by this feature**:

### `TraceEvent` (discriminated union)

The canonical unit of AeroGraph observability. 10 variants:

| Kind | Actor Kind | Payload Key Fields |
|---|---|---|
| `prompt` | `agent` | `text: string` |
| `response` | `agent` | `text: string`, optional `streamingTelemetry` |
| `tool_call` | `tool` | `input: Record<string, unknown>` |
| `tool_result` | `tool` | `output: Record<string, unknown>` |
| `handoff` | `system` | `fromAgentId, toAgentId, reason?` |
| `error` | any | `message: string`, `details: Record<string, unknown>` |
| `note` | any | `payload: Record<string, unknown>` |
| `retriever` | `tool` | `query: string`, `documents: RetrieverDocument[]` |
| `checkpoint` | `system` | `checkpointId, reason, state` |
| `state_snapshot` | `system` | `nodeName, stateHash, stateDiff, fullState, removedKeys?` |

All variants share these base fields:
```
schemaVersion: "1.0.0"
traceId: string       // 32-char hex
spanId: string        // 16-char hex
parentSpanId: string | null
occurredAt: string    // ISO 8601
actor: { kind, id, name? }
status: "ok" | "error"
title?: string
links: TraceLink[]
```

### `TraceLink`

```
{ rel: "follows" | "caused_by" | "handoff_to", spanId: string }
```

---

## 2. New Bridge-Internal Data Structures

These are **transient** data structures used only within the bridge packages. They are never persisted.

### 2.1 `OtlpSpan` (Import input / Export output)

Represents a single OTel span in OTLP/JSON format. This is the bridge's I/O format for interoperability.

```typescript
interface OtlpSpan {
  traceId: string;           // 32-char hex
  spanId: string;            // 16-char hex
  parentSpanId?: string;     // 16-char hex, absent for root spans
  name: string;              // span name (e.g. "gen_ai.chat")
  kind: SpanKind;            // 0-5 integer enum
  startTimeUnixNano: string; // nanoseconds since epoch as decimal string
  endTimeUnixNano: string;   // nanoseconds since epoch as decimal string
  status?: {
    code: StatusCode;        // 0=unset, 1=ok, 2=error
    message?: string;
  };
  attributes: OtlpAttribute[];
  links?: OtlpLink[];
  events?: OtlpEvent[];
}

interface OtlpAttribute {
  key: string;
  value: OtlpAnyValue;       // { stringValue } | { intValue } | { boolValue } | { doubleValue } | { arrayValue }
}

interface OtlpLink {
  traceId: string;
  spanId: string;
  attributes?: OtlpAttribute[];
}

interface OtlpEvent {
  name: string;
  timeUnixNano: string;
  attributes?: OtlpAttribute[];
}
```

**Validation rules**:
- `traceId` must be 32 hex chars
- `spanId` must be 16 hex chars
- `startTimeUnixNano` must be parseable as a positive integer string

### 2.2 `OtlpExportRequest` (Export output / Collector import input)

The full OTLP/JSON envelope accepted by OTel-compatible backends and the collector's new `/v1/otlp/traces` endpoint.

```typescript
interface OtlpExportRequest {
  resourceSpans: OtlpResourceSpan[];
}

interface OtlpResourceSpan {
  resource: {
    attributes: OtlpAttribute[];  // e.g. service.name
  };
  scopeSpans: OtlpScopeSpan[];
}

interface OtlpScopeSpan {
  scope: {
    name: string;     // "aerograph-otel"
    version: string;  // package version
  };
  spans: OtlpSpan[];
}
```

### 2.3 `MappingContext` (Import path)

Transient context object passed through the mapping functions to carry shared state during a batch conversion.

```typescript
interface MappingContext {
  traceId: string;                  // target AeroGraph traceId
  defaultActorId: string;           // fallback actor id when not extractable
  preserveOriginalIds: boolean;     // whether to store original OTel IDs as attrs
}
```

### 2.4 `SemanticMapper` (Interface)

The canonical interface both TypeScript and Python implementations must satisfy.

```typescript
interface SemanticMapper {
  // AeroGraph → OTel
  eventToSpan(event: TraceEvent): OtlpSpan;

  // OTel → AeroGraph (best-effort; fallback to "note")
  spanToEvent(span: OtlpSpan, ctx: MappingContext): TraceEvent;
}
```

---

## 3. AeroGraph-Specific OTel Attribute Constants

All custom attributes use the `aerograph.` namespace prefix to avoid collision with official conventions.

### 3.1 Universal Attributes (on every exported span)

| Attribute Key | Type | Description |
|---|---|---|
| `aerograph.schema_version` | string | e.g. `"1.0.0"` |
| `aerograph.kind` | string | the AeroGraph event kind |
| `aerograph.actor.id` | string | actor id |
| `aerograph.actor.kind` | string | `agent`, `tool`, or `system` |
| `aerograph.actor.name` | string (optional) | actor display name |
| `aerograph.status` | string | `ok` or `error` |
| `aerograph.title` | string (optional) | event title |

### 3.2 Link Attributes (on span links)

| Attribute Key | Type | Description |
|---|---|---|
| `aerograph.link.rel` | string | `follows`, `caused_by`, or `handoff_to` |

### 3.3 Kind-Specific Payload Attributes

**`prompt`**:
| `aerograph.prompt.text` | string | prompt text |

**`response`**:
| `aerograph.response.text` | string | response text |
| `aerograph.response.time_to_first_token_ms` | double | streaming telemetry |
| `aerograph.response.total_duration_ms` | double | streaming telemetry |
| `aerograph.response.tokens_per_second` | double | streaming telemetry |
| `aerograph.response.token_count` | int | streaming telemetry |

**`retriever`**:
| `aerograph.retriever.query` | string | retrieval query |
| `aerograph.retriever.document_count` | int | number of documents returned |

**`checkpoint`**:
| `aerograph.checkpoint.id` | string | checkpoint identifier |
| `aerograph.checkpoint.reason` | string | reason for checkpoint |

**`state_snapshot`**:
| `aerograph.state_snapshot.node_name` | string | LangGraph node name |
| `aerograph.state_snapshot.state_hash` | string | deterministic hash of state |

**`handoff`**:
| `aerograph.handoff.from_agent_id` | string | source agent |
| `aerograph.handoff.to_agent_id` | string | target agent |
| `aerograph.handoff.reason` | string (optional) | handoff reason |

**`error`**:
| `aerograph.error.message` | string | error message |
| `aerograph.error.details` | string | JSON-serialized details map |

**`note`**:
| `aerograph.note.payload` | string | JSON-serialized note payload |

**`tool_call`**:
| `aerograph.tool_call.input` | string | JSON-serialized input |

**`tool_result`**:
| `aerograph.tool_result.output` | string | JSON-serialized output |

### 3.4 Import-Only Attributes

| Attribute Key | Type | Description |
|---|---|---|
| `aerograph.otel_imported` | bool | `true` for spans ingested from external OTel sources |

---

## 4. Timestamp Conversion

### AeroGraph → OTel (Export)

```
occurredAt (ISO 8601) → Unix epoch nanoseconds string
```

Algorithm (both languages):
1. Parse ISO 8601 string to a datetime with millisecond precision
2. Convert to Unix epoch in seconds
3. Multiply by 1,000,000,000 (nanoseconds)
4. Add milliseconds component × 1,000,000
5. Serialize as decimal string (no float representation)

`endTimeUnixNano = startTimeUnixNano + 1_000_000` (1ms synthetic duration for point events)

### OTel → AeroGraph (Import)

```
startTimeUnixNano (decimal string) → ISO 8601 string
```

Algorithm:
1. Parse decimal string to integer (BigInt in TS, int in Python)
2. Divide by 1,000,000,000 to get seconds + nanoseconds remainder
3. Convert to UTC datetime with millisecond precision
4. Serialize as ISO 8601 (`Z`-terminated)

---

## 5. ID Format Compatibility

**Finding from research**: AeroGraph IDs are already valid OTel IDs:
- AeroGraph `traceId` = 32-char lowercase hex string → **directly usable** as OTel `traceId`
- AeroGraph `spanId` = 16-char lowercase hex string → **directly usable** as OTel `spanId`

No ID translation is required for the export path. For the import path, incoming OTel IDs are already in the correct format for AeroGraph storage.

**Verification**: Both Python (`secrets.token_hex(16)` → 32 chars, `secrets.token_hex(8)` → 16 chars) and TypeScript (`nanoid` configured to produce hex) must generate hex-only IDs of the exact lengths. Parity tests cover this.
