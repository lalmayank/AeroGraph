# AeroGraph SDK

This package provides a `FlightRecorder` client for emitting normalized trace events from any agent or framework.

## Usage for Adapters

When building an adapter (e.g., for LangChain, AutoGen, or CrewAI), use the SDK to deterministically map framework execution signals to the shared `@aerograph/contracts` schema.

```typescript
import { FlightRecorder } from "@aerograph/sdk";

const recorder = new FlightRecorder({
  endpoint: "http://localhost:4317",
  actor: { id: "my-agent-name" }
});

// Emitting a prompt
await recorder.prompt({
  parentSpanId: null, // Null for root spans
  text: "Hello agent"
});

// Emitting a tool call
// The SDK handles actor normalization (sets actor.kind = 'tool' automatically)
await recorder.toolCall({
  parentSpanId: "parent-span-id",
  toolId: "calculator",
  input: { expression: "2 + 2" }
});
```

### Determinism

- Pass `spanId` explicitly if your framework provides deterministic run IDs.
- Pass `parentSpanId` to correctly build the execution hierarchy.
- The SDK automatically injects `schemaVersion`, `occurredAt`, and applies the correct `actor.kind` invariants required by the contracts.
