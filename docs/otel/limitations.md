# OpenTelemetry Bridge Limitations

While the AeroGraph OTLP Bridge acts as a highly robust translation layer, specific architectural differences mean some nuances should be understood.

## 1. Information Loss on Export (Point-in-Time Events)

AeroGraph `TraceEvent` records are fundamentally points in time (`occurredAt`). OpenTelemetry spans, conversely, expect a `startTime` and an `endTime`. 
- **Export Behavior**: When exporting AeroGraph events to OTLP, the bridge generates a synthetic 1-millisecond duration. 
- **Import Behavior**: When importing from OTLP back to AeroGraph, only `startTime` is mapped back to `occurredAt`, meaning external durations are intentionally discarded by the semantic model.

## 2. Granular Streaming Telemetry

If an incoming OTLP span contains generalized LLM streaming attributes (e.g. from an unsupported SDK format), those attributes may not map identically to AeroGraph's strict `streamingTelemetry` block (`timeToFirstTokenMs`, `totalDurationMs`, etc.) unless they map to the specific `aerograph.*` custom namespaces. In standard heuristic fallbacks, foreign attributes are retained inside the payload but aren't strictly promoted to canonical UI visualizer metrics.

## 3. ID Preservation Boundaries

AeroGraph natively uses standard hex strings for `traceId` (32 characters) and `spanId` (16 characters), making them fully compatible with OTLP specifications.
- External IDs coming *in* via OTLP are preserved seamlessly as long as they fit this specification. 
- However, generating new events inside AeroGraph with poorly formatted external trace IDs might break W3C Trace Context validation in strict downstream OTLP processors.

## 4. No Runtime OTel SDK Features

The `@aerograph/otel` bridge is pure JSON-translation code without any heavy `@opentelemetry/sdk-trace-base` dependencies. Therefore:
- The bridge itself does not perform batching, retry handling, or HTTP POST polling.
- Users must use their own fetch/Axios/requests calls to push the generated `OtlpExportRequest` objects to remote servers if running outside of the collector.
