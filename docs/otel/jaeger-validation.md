# Jaeger Validation Guide

This guide provides instructions for validating the AeroGraph to OpenTelemetry (OTLP) export bridge using a local Jaeger instance. It explains how to start Jaeger, run the validation examples, and inspect traces to verify correct topology reconstruction.

## Prerequisites

- Docker installed
- Node.js >= 18.18
- Local monorepo environment setup

## Starting Jaeger

Start an all-in-one Jaeger instance via Docker. This exposes the Jaeger UI as well as the OTLP HTTP and gRPC receivers.

```bash
docker run --rm -p 16686:16686 -p 4317:4317 -p 4318:4318 jaegertracing/jaeger:latest
```

**Exposed Ports:**
- `16686`: Jaeger Web UI (http://localhost:16686)
- `4317`: OTLP gRPC receiver
- `4318`: OTLP HTTP receiver (Used by our examples)

## Running Validation Examples

We provide two example packages in the `examples/` directory to demonstrate trace export.

### 1. Synthetic Topology Demo
This demo exports handcrafted, canonical topologies (handoffs, tool hierarchies, etc.) directly to Jaeger using `@aerograph/otel`.

```bash
cd examples/otel-jaeger-demo
npm install
npm start
```

### 2. LangChain Integration Demo
This demo runs a basic LangChain agent with the `@aerograph/adapter-langchain` to capture execution, which is then piped to Jaeger.

```bash
cd examples/otel-langchain-demo
npm install
npm start
```

## Inspecting Traces in Jaeger

Once the examples have successfully executed, open [http://localhost:16686](http://localhost:16686) in your browser.

### Search Criteria
1. Under **Service**, select `aerograph-agent`.
2. Click **Find Traces**.
3. You should see traces representing the executed examples.

### What to Verify
When you click on a specific trace, verify the following:

- **Hierarchical Layout**: Parent spans (`gen_ai.chat`, `gen_ai.tool.call`) should visually enclose their child spans (`gen_ai.response`, `gen_ai.tool.result`).
- **Span Details**: Click on a span to expand its attributes.
- **AeroGraph Attributes**: Verify that custom `aerograph.*` attributes are present (e.g., `aerograph.kind`, `aerograph.actor.id`, `aerograph.response.token_count`).
- **Standard GenAI Attributes**: Verify standard `gen_ai.*` attributes map correctly.
- **Timestamps and Durations**:
  - Spans representing durations (like `response`) should show actual time spans.
  - Point-in-time events (like `checkpoint`, `handoff`) should appear as very brief spans (our bridge artificially sets them to 1ms to ensure visibility).
- **Span Links (Handoffs)**: Handoff events (`gen_ai.agent.handoff`) should show links connecting the traces of the two agents. This often appears as a link icon or within the span metadata in the UI.

> [!WARNING]
> **ID Normalization**: OTLP strictly requires `traceId` to be a 32-character hex string and `spanId` to be a 16-character hex string. While our canonical golden fixtures follow this requirement, real-world trace generators (like LangChain) often produce UUIDs or other non-compliant formats. The `otel-langchain-demo` demonstrates how to deterministically hash these non-compliant IDs into valid OTLP hex formats during export.

For a formal mapping of expected topologies, see the [Topology Validation Matrix](./topology-validation-matrix.md).
