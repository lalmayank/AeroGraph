# Topology Validation Matrix

This document maps AeroGraph trace topologies to their expected visual representation within an OpenTelemetry observability UI, such as Jaeger. Use this matrix to verify that the export bridge is correctly translating concepts.

## 1. Trace Hierarchy & Nested Structures

| AeroGraph Concept | OTLP Representation | Expected UI Visualization | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Trace Membership** | `traceId` shared across spans | All spans appear in the same Trace view | **PASS**: Searching by trace ID returns all related spans in one view. |
| **Parent-Child Link** | `parentSpanId` reference | Indented, nested visualization (e.g. `response` is visually a child of `prompt`) | **PASS**: The UI clearly shows the child span nested under the parent span. |
| **Span Names** | `name` field | Human-readable action names (`gen_ai.chat`, `gen_ai.tool.call`) | **PASS**: Span titles in the UI match the expected OTLP GenAI conventions or `aerograph.*` fallbacks. |

## 2. Event Types & Semantics

| AeroGraph Event Kind | OTLP Span Kind | Expected UI Visualization | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| `prompt`, `response`, `tool_call`, `retriever` | `SPAN_KIND_CLIENT` (3) | Usually represented as an outgoing request or external interaction | **PASS**: Span is correctly categorized as a "Client" span. |
| `tool_result`, `handoff`, `error`, `note`, `checkpoint`, `state_snapshot` | `SPAN_KIND_INTERNAL` (1) | Usually represented as an internal process or marker | **PASS**: Span is correctly categorized as an "Internal" span. |

## 3. Metadata & Attributes

| AeroGraph Data | OTLP Attribute | Expected UI Visualization | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Actor Details** | `aerograph.actor.id`, `aerograph.actor.kind` | Key-value pairs in the span's tag/attribute panel | **PASS**: Clicking a span reveals the exact actor ID and kind that produced the event. |
| **Payloads** | e.g. `aerograph.tool_call.input`, `aerograph.response.text` | Key-value pairs in the span's tag/attribute panel | **PASS**: Complex payloads are visible as stringified JSON or plain text attributes. |
| **Status (OK)** | `status.code = 1` (OK) | Standard successful span (usually no special color) | **PASS**: Span indicates success. |
| **Status (Error)** | `status.code = 2` (ERROR) | Span visually flagged as an error (e.g., highlighted in red, error icon) | **PASS**: The UI clearly flags the span as an error. |
| **Error Message** | `status.message` | Visible error text on the span | **PASS**: The specific error message is readable. |

## 4. Time & Duration

| AeroGraph Concept | OTLP Representation | Expected UI Visualization | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Interval Events** | Distinct `occurredAt` for pairs (e.g. prompt then response) | Proper visual timeline indicating duration | **PASS**: Timeline accurately reflects the interval between events. |
| **Point-in-Time Events** | `startTimeUnixNano` = `endTimeUnixNano - 1ms` | Tiny, practically zero-duration markers | **PASS**: Point events (`note`, `checkpoint`) appear as 1ms ticks on the timeline, preserving their exact chronological order. |

## 5. Cross-Trace Links

| AeroGraph Concept | OTLP Representation | Expected UI Visualization | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- |
| **Handoff / Follows From** | `links` array with `aerograph.link.rel` | Visual indicator or hyperlink to another trace/span | **PASS**: The UI shows a link connecting the current span to the target span of the handoff, often allowing click-through navigation. |
