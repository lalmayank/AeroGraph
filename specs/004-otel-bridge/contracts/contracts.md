# Contracts: Feature 004 — OpenTelemetry Bridge

**Phase 1 Output** | **Branch**: `004-otel-bridge` | **Date**: 2026-06-09

---

## Governing Principle

`@aerograph/contracts` remains the **sole** canonical source of truth for all AeroGraph data types. This document defines the **external-facing interface contracts** for the OTel bridge packages — the APIs they expose and the OTLP structures they accept/produce. None of these contracts modify or supplement `@aerograph/contracts`.

---

## 1. TypeScript Package: `@aerograph/otel`

**Package location**: `packages/otel/`  
**npm name**: `@aerograph/otel`  
**Peer deps**: `@aerograph/contracts`, `zod`

### 1.1 Export API

```typescript
// packages/otel/src/index.ts

/**
 * Export a single AeroGraph TraceEvent to an OTLP-compatible span structure.
 * Deterministic: same input always produces the same output.
 */
export function exportEventToOtlpSpan(event: TraceEvent): OtlpSpan;

/**
 * Export an array of TraceEvents to a complete OtlpExportRequest envelope.
 * Events are sorted deterministically before export.
 * Preserves parent-child relationships and links.
 */
export function exportEventsToOtlp(
  events: TraceEvent[],
  options?: ExportOptions
): OtlpExportRequest;

export interface ExportOptions {
  serviceName?: string;      // default: "aerograph-agent"
  scopeName?: string;        // default: "@aerograph/otel"
  scopeVersion?: string;     // default: package version
}
```

### 1.2 Import API

```typescript
/**
 * Convert a single OTLP span to an AeroGraph TraceEvent.
 * Uses aerograph.kind attribute when present (lossless round-trip).
 * Falls back to heuristic mapping (see Semantic Mapping in data-model.md).
 * Returns a validated TraceEvent or throws on irrecoverable structure.
 */
export function importOtlpSpanToEvent(
  span: OtlpSpan,
  ctx: MappingContext
): TraceEvent;

/**
 * Convert a complete OtlpExportRequest to a flat array of TraceEvents.
 * Preserves trace topology (parentSpanId, links).
 * Events are sorted deterministically after conversion.
 */
export function importOtlpToEvents(
  request: OtlpExportRequest,
  ctx?: Partial<MappingContext>
): TraceEvent[];
```

### 1.3 Semantic Mapping Utilities

```typescript
/**
 * All AeroGraph-specific OTel attribute key constants.
 * Use these to construct or read attributes deterministically.
 */
export const AEROGRAPH_ATTRS: {
  SCHEMA_VERSION: 'aerograph.schema_version';
  KIND: 'aerograph.kind';
  ACTOR_ID: 'aerograph.actor.id';
  ACTOR_KIND: 'aerograph.actor.kind';
  ACTOR_NAME: 'aerograph.actor.name';
  STATUS: 'aerograph.status';
  TITLE: 'aerograph.title';
  LINK_REL: 'aerograph.link.rel';
  PROMPT_TEXT: 'aerograph.prompt.text';
  RESPONSE_TEXT: 'aerograph.response.text';
  RETRIEVER_QUERY: 'aerograph.retriever.query';
  RETRIEVER_DOCUMENT_COUNT: 'aerograph.retriever.document_count';
  CHECKPOINT_ID: 'aerograph.checkpoint.id';
  CHECKPOINT_REASON: 'aerograph.checkpoint.reason';
  STATE_SNAPSHOT_NODE_NAME: 'aerograph.state_snapshot.node_name';
  STATE_SNAPSHOT_STATE_HASH: 'aerograph.state_snapshot.state_hash';
  HANDOFF_FROM_AGENT_ID: 'aerograph.handoff.from_agent_id';
  HANDOFF_TO_AGENT_ID: 'aerograph.handoff.to_agent_id';
  HANDOFF_REASON: 'aerograph.handoff.reason';
  ERROR_MESSAGE: 'aerograph.error.message';
  ERROR_DETAILS: 'aerograph.error.details';
  NOTE_PAYLOAD: 'aerograph.note.payload';
  TOOL_CALL_INPUT: 'aerograph.tool_call.input';
  TOOL_RESULT_OUTPUT: 'aerograph.tool_result.output';
  OTEL_IMPORTED: 'aerograph.otel_imported';
};

/**
 * Timestamp utilities.
 */
export function isoToUnixNano(isoString: string): string;   // returns decimal string
export function unixNanoToIso(nanoString: string): string;  // returns ISO 8601
```

### 1.4 OtlpExportRequest Zod Schema (for collector validation)

```typescript
// packages/otel/src/otlp-schema.ts

export const otlpAttributeSchema = z.object({
  key: z.string(),
  value: z.union([
    z.object({ stringValue: z.string() }),
    z.object({ intValue: z.union([z.string(), z.number()]) }),
    z.object({ boolValue: z.boolean() }),
    z.object({ doubleValue: z.number() }),
  ])
});

export const otlpSpanSchema = z.object({
  traceId: z.string().regex(/^[0-9a-f]{32}$/i),
  spanId: z.string().regex(/^[0-9a-f]{16}$/i),
  parentSpanId: z.string().regex(/^[0-9a-f]{16}$/i).optional(),
  name: z.string().min(1),
  kind: z.number().int().min(0).max(5).default(0),
  startTimeUnixNano: z.string(),
  endTimeUnixNano: z.string(),
  status: z.object({
    code: z.number().int().min(0).max(2).default(0),
    message: z.string().optional(),
  }).optional(),
  attributes: z.array(otlpAttributeSchema).default([]),
  links: z.array(z.object({
    traceId: z.string(),
    spanId: z.string(),
    attributes: z.array(otlpAttributeSchema).optional(),
  })).optional(),
});

export const otlpExportRequestSchema = z.object({
  resourceSpans: z.array(z.object({
    resource: z.object({ attributes: z.array(otlpAttributeSchema).default([]) }).optional(),
    scopeSpans: z.array(z.object({
      scope: z.object({ name: z.string(), version: z.string().optional() }).optional(),
      spans: z.array(otlpSpanSchema),
    })),
  })),
});

export type OtlpExportRequest = z.infer<typeof otlpExportRequestSchema>;
export type OtlpSpan = z.infer<typeof otlpSpanSchema>;
```

---

## 2. Python Package: `aerograph-otel`

**Package location**: `python/aerograph-otel/`  
**PyPI name**: `aerograph-otel`  
**Dependencies**: `aerograph-sdk`

### 2.1 Export API

```python
# aerograph_otel/__init__.py

def export_event_to_otlp_span(event: TraceEvent) -> dict:
    """
    Convert a single AeroGraph TraceEvent to an OTLP-compatible span dict.
    Deterministic: same input always produces the same output.

    Returns a dict matching the OtlpSpan structure.
    """

def export_events_to_otlp(
    events: list[TraceEvent],
    *,
    service_name: str = "aerograph-agent",
    scope_name: str = "aerograph-otel",
    scope_version: str = __version__,
) -> dict:
    """
    Convert a list of TraceEvents to a complete OTLP/JSON export request dict.
    Events are sorted deterministically before export.
    Returns a dict matching OtlpExportRequest structure (JSON-serializable).
    """
```

### 2.2 Import API

```python
def import_otlp_span_to_event(span: dict, ctx: MappingContext) -> TraceEvent:
    """
    Convert a single OTLP span dict to an AeroGraph TraceEvent.
    Uses aerograph.kind attribute when present (lossless round-trip).
    Falls back to heuristic semantic mapping.
    Validates the result as a proper TraceEvent using aerograph-sdk contracts.
    """

def import_otlp_to_events(
    request: dict,
    *,
    default_actor_id: str = "otel-import",
    preserve_original_ids: bool = True,
) -> list[TraceEvent]:
    """
    Convert a complete OTLP export request dict to a sorted list of TraceEvents.
    Preserves trace topology. Events sorted deterministically after conversion.
    """
```

### 2.3 Attribute Constants

```python
# aerograph_otel/constants.py

class AeroGraphAttrs:
    SCHEMA_VERSION = "aerograph.schema_version"
    KIND = "aerograph.kind"
    ACTOR_ID = "aerograph.actor.id"
    ACTOR_KIND = "aerograph.actor.kind"
    ACTOR_NAME = "aerograph.actor.name"
    STATUS = "aerograph.status"
    TITLE = "aerograph.title"
    LINK_REL = "aerograph.link.rel"
    PROMPT_TEXT = "aerograph.prompt.text"
    RESPONSE_TEXT = "aerograph.response.text"
    RETRIEVER_QUERY = "aerograph.retriever.query"
    RETRIEVER_DOCUMENT_COUNT = "aerograph.retriever.document_count"
    CHECKPOINT_ID = "aerograph.checkpoint.id"
    CHECKPOINT_REASON = "aerograph.checkpoint.reason"
    STATE_SNAPSHOT_NODE_NAME = "aerograph.state_snapshot.node_name"
    STATE_SNAPSHOT_STATE_HASH = "aerograph.state_snapshot.state_hash"
    HANDOFF_FROM_AGENT_ID = "aerograph.handoff.from_agent_id"
    HANDOFF_TO_AGENT_ID = "aerograph.handoff.to_agent_id"
    HANDOFF_REASON = "aerograph.handoff.reason"
    ERROR_MESSAGE = "aerograph.error.message"
    ERROR_DETAILS = "aerograph.error.details"
    NOTE_PAYLOAD = "aerograph.note.payload"
    TOOL_CALL_INPUT = "aerograph.tool_call.input"
    TOOL_RESULT_OUTPUT = "aerograph.tool_result.output"
    OTEL_IMPORTED = "aerograph.otel_imported"
```

---

## 3. Collector Extension: OTLP Ingestion Endpoint

**Modified file**: `apps/collector/src/server.ts`

### 3.1 New Route

```
POST /v1/otlp/traces
Content-Type: application/json
Accept: application/json

Request body: OtlpExportRequest (OTLP/JSON format)
Response: 201 Created (success) | 400 Bad Request (validation error)
```

### 3.2 Route Behavior

1. Validate body against `otlpExportRequestSchema` (from `@aerograph/otel`)
2. Extract all spans from `resourceSpans[*].scopeSpans[*].spans`
3. For each span, call `importOtlpSpanToEvent()` with a shared `MappingContext`
4. Validate each resulting `TraceEvent` using `validateTraceEvent()` from `@aerograph/contracts`
5. Call `store.appendEvent(event)` for each validated event (append-only)
6. Return `201` on success, `400` on any validation failure

### 3.3 Additive Contract Guarantee

The existing `POST /v1/events` route is **not modified**. The new `/v1/otlp/traces` route is an independent, additive endpoint. Removing or disabling it has no effect on existing functionality.

---

## 4. Parity Contract

Both `@aerograph/otel` (TypeScript) and `aerograph-otel` (Python) MUST produce identical output for the same canonical input, verified by shared fixture files.

### 4.1 Shared Golden Fixtures

Location: `specs/004-otel-bridge/fixtures/`

Structure:
```
fixtures/
├── prompt_event.json         # canonical AeroGraph TraceEvent (prompt kind)
├── response_event.json       # ...
├── tool_call_event.json
├── tool_result_event.json
├── handoff_event.json
├── error_event.json
├── note_event.json
├── retriever_event.json
├── checkpoint_event.json
├── state_snapshot_event.json
└── expected_otlp/
    ├── prompt_span.json      # expected OTLP span output for prompt_event
    ├── response_span.json
    └── ...                   # one per event kind
```

### 4.2 Parity Test Contract

Each fixture triple (AeroGraph event → OTLP span → AeroGraph event round-trip) must satisfy:
- Export output matches `expected_otlp/*.json` exactly (deterministic)
- Round-trip reconstructs original event with all topology-critical fields preserved
- TS test output equals Python test output for the same fixture
