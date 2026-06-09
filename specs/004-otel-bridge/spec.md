# Feature Specification: OpenTelemetry Bridge

**Feature Branch**: `004-otel-bridge`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Feature 004 — OpenTelemetry Bridge"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export AeroGraph Traces to OpenTelemetry (Priority: P1)

As a system operator, I want to export AeroGraph traces into my existing OpenTelemetry-compatible observability stack (e.g., Jaeger, Datadog), so that I can visualize agent executions alongside my other microservices without deploying new infrastructure.

**Why this priority**: Interoperability with existing OTel tools is the primary value proposition, allowing teams to adopt AeroGraph observability seamlessly.

**Independent Test**: Can be tested by running an AeroGraph agent, passing the trace through the OTel Export Bridge, and successfully visualizing the deterministic span structures in an OTLP-compliant backend.

**Acceptance Scenarios**:

1. **Given** an AeroGraph trace with a prompt and response, **When** exported through the OTel bridge, **Then** a valid OTLP span hierarchy is generated preserving chronological order and causality.
2. **Given** an AeroGraph trace containing lineage and state snapshots, **When** exported to OTel, **Then** the AeroGraph-specific attributes and lineage metadata are preserved correctly as span attributes/events.

---

### User Story 2 - Ingest OpenTelemetry Spans to AeroGraph (Priority: P2)

As a developer, I want to ingest standard OpenTelemetry spans from external libraries or services and convert them into canonical AeroGraph TraceEvents, so that I have a unified, append-only, replay-safe trace in the AeroGraph Collector.

**Why this priority**: Enables the AeroGraph collector to act as a centralized tracing hub, capturing context from non-AeroGraph systems while preserving strict replayability and governance.

**Independent Test**: Can be tested by sending standard OTLP spans to the Import Bridge and verifying the resulting AeroGraph TraceEvents maintain structural and chronological integrity.

**Acceptance Scenarios**:

1. **Given** a set of OTLP spans with parent-child relationships, **When** ingested through the OTel Import Bridge, **Then** canonical AeroGraph TraceEvents are generated with preserved trace IDs, span IDs, and parent-child hierarchy.
2. **Given** an OTLP span containing status/error information, **When** ingested, **Then** the resulting TraceEvent accurately maps the error state in a replay-safe manner.

---

### User Story 3 - Trace Correlation (Priority: P3)

As a debugging engineer, I want external OpenTelemetry traces to correlate seamlessly with my AeroGraph traces, so that I can trace a request from an external web service, through an API gateway, into the AeroGraph agent execution, and out to external tools.

**Why this priority**: Cross-system trace stitching is vital for full-stack visibility.

**Independent Test**: Can be tested by validating trace links and cross-system causality across an OTel span and an AeroGraph TraceEvent.

**Acceptance Scenarios**:

1. **Given** an incoming request with an existing OTel trace context, **When** an AeroGraph execution is initiated, **Then** the generated AeroGraph trace properly links or correlates to the external trace context.

### Edge Cases

- What happens when incoming OTel spans arrive out-of-order or are missing parent spans?
- How does the system handle massive OTel span attributes that exceed AeroGraph event size limits?
- What happens if the OTel spans lack clear semantic conventions mapped to AeroGraph Event Types (e.g., standard HTTP spans without GenAI context)?
- How does the system handle trace correlation when external spans use varying W3C trace context formats?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an OTel Import Bridge capable of ingesting OpenTelemetry spans and converting them into canonical AeroGraph TraceEvents.
- **FR-002**: The OTel Import Bridge MUST preserve trace relationships, trace IDs, span IDs, timestamps, status, and error information in a deterministic, replay-safe manner.
- **FR-003**: System MUST provide an OTel Export Bridge to convert AeroGraph TraceEvents into valid OTLP-compatible spans.
- **FR-004**: The OTel Export Bridge MUST preserve trace graph topology, AeroGraph lineage metadata, retriever events, checkpoint events, and state snapshots.
- **FR-005**: System MUST define a Semantic Mapping Layer between AeroGraph Event Types (prompt, response, tool_call, tool_result, handoff, error, note, retriever, checkpoint, state_snapshot) and OTel span/event concepts.
- **FR-006**: The Semantic Mapping Layer MUST use existing OpenTelemetry semantic conventions where applicable, and define AeroGraph-specific attributes where conventions do not exist.
- **FR-007**: System MUST support trace correlation, trace linking, and cross-system trace stitching to preserve causality between external OTel traces and AeroGraph traces.
- **FR-008**: AeroGraph contracts MUST remain the canonical source of truth; the OTel bridge MUST NOT become a second source of truth.
- **FR-009**: The schema exporter MUST remain authoritative and all generated artifacts MUST remain deterministic.
- **FR-010**: System MUST provide identical implementations in both TypeScript (`@aerograph/otel`) and Python (`aerograph-otel`), proven by parity tests.
- **FR-011**: The Collector MUST provide an optional OTel ingestion endpoint that integrates without breaking existing REST APIs or compromising append-only persistence.

### Key Entities *(include if feature involves data)*

- **OTel Import Bridge**: Service/Component responsible for translating incoming OTel structures into canonical TraceEvents.
- **OTel Export Bridge**: Service/Component responsible for translating AeroGraph TraceEvents into OTLP-compliant spans.
- **Semantic Mapping Definition**: The unified set of rules dictating how attributes and events map back and forth, avoiding vendor lock-in and remaining forward-compatible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% round-trip semantic conversion accuracy between AeroGraph TraceEvents and OTel spans (no loss of required topological or chronological data).
- **SC-002**: 100% pass rate for identical parity tests executed against both the TypeScript and Python implementations.
- **SC-003**: AeroGraph traces successfully visualize without structural errors in at least two major external OTel observability tools (e.g., Jaeger, standard OTel Collector).
- **SC-004**: Zero breaking changes to the existing AeroGraph contracts or schema exporter pipelines.
- **SC-005**: The Collector's append-only constraint is perfectly maintained when ingesting OTel spans.

## Assumptions

- OTLP (OpenTelemetry Protocol) over HTTP/JSON or HTTP/gRPC is the expected transport mechanism for external tools interacting with the Collector's OTel ingestion endpoint.
- Existing standard OpenTelemetry GenAI semantic conventions will be prioritized, and any custom attributes will be properly namespaces to avoid future collisions.
- No new distributed telemetry storage infrastructure needs to be provisioned outside of the AeroGraph collector.
