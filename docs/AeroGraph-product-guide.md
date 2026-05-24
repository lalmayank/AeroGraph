# AeroGraph Product Guide

AeroGraph is a local-first tracing system for AI agent workflows. It captures the important events that happen during a run, stores them in a shared contract, and makes them inspectable as a trace graph so developers can debug behavior instead of guessing from logs.

The core idea is simple:

- capture prompts, responses, tool calls, tool outputs, handoffs, errors, and notes
- persist them in a replay-safe store
- retrieve and inspect traces by trace ID
- visualize how execution flowed across agents and tools
- compare or branch traces when you need to understand behavior changes

## Who Uses It

### Individual developers

A developer building a single agent can use AeroGraph to answer questions like:

- What prompt did the model actually receive?
- Which tool was called, with what input, and what output came back?
- Where did the run fail?
- Did the agent loop or repeat the same tool call?

### Teams building multi-agent systems

A team can use it when one agent hands work to another agent or when several tools are chained together. The trace becomes a shared debugging artifact that shows the full execution path across the system.

### SDK consumers

Anyone embedding the recorder into their own code uses the SDK directly. The SDK gives them a small set of functions to emit normalized events into the collector.

### LangChain users

LangChain users can connect the adapter and automatically translate LangChain callback events into AeroGraph events.

## End-to-End User Flow

1. Start the collector service.
2. Create a `FlightRecorder` in application code.
3. Emit normalized events during agent execution.
4. Open a trace by trace ID and inspect the payloads.
5. Fork a trace when you want to test an alternative prompt or continuation.
6. Compare traces to see what changed.
7. Review analysis output to spot likely loops and failures.

## SDK Surface

The SDK lives in `@afr/sdk` and exposes the `FlightRecorder` client. This is the main API that end users call from their own application code.

### Basic recorder setup

```ts
import { FlightRecorder } from "@afr/sdk";

const recorder = new FlightRecorder({
  endpoint: "http://localhost:4317",
  actor: { id: "support-agent", name: "Support Agent" },
  traceId: "t_support_001"
});
```

### Emitting events directly

```ts
await recorder.prompt({
  parentSpanId: null,
  text: "Help the user reset their password"
});

await recorder.response({
  parentSpanId: "root-span-id",
  text: "I found the reset flow and am checking account status."
});

await recorder.toolCall({
  parentSpanId: "root-span-id",
  toolId: "lookup_account",
  toolName: "Lookup Account",
  input: { email: "user@example.com" }
});

await recorder.toolResult({
  parentSpanId: "tool-span-id",
  toolId: "lookup_account",
  toolName: "Lookup Account",
  output: { accountStatus: "active" }
});

await recorder.handoff({
  parentSpanId: "root-span-id",
  fromAgentId: "triage-agent",
  toAgentId: "billing-agent",
  reason: "User request requires billing review"
});

await recorder.error({
  parentSpanId: "tool-span-id",
  message: "Timeout while calling upstream service"
});
```

### When to use each SDK function

- `prompt(...)` for the user prompt or agent input boundary
- `response(...)` for model output
- `toolCall(...)` for tool invocation input
- `toolResult(...)` for tool output
- `handoff(...)` for agent-to-agent transfer
- `error(...)` for failures
- `note(...)` for extra structured context that should appear in the trace graph

### Deterministic tracing

If your runtime already has stable run IDs, pass them in as `spanId` so traces line up across systems. If you do not pass IDs, the SDK generates them for you. The SDK also normalizes actor kind and injects the current schema version automatically.

## LangChain Integration

The LangChain adapter lives in `@afr/adapter-langchain`. It converts LangChain callback events into AeroGraph events using a deterministic mapping.

### How it works

```ts
import { createAgent, tool } from "langchain";
import * as z from "zod";
import { FlightRecorder } from "@afr/sdk";
import { createLangChainHandler } from "@afr/adapter-langchain";

const recorder = new FlightRecorder({
  endpoint: "http://localhost:4317",
  actor: { id: "langchain-agent", name: "LangChain Agent" }
});

const traceHandler = createLangChainHandler({ recorder });

const getWeather = tool(
  (input) => `It is always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for")
    })
  }
);

const agent = createAgent({
  model: "gpt-5.4",
  tools: [getWeather]
});

await agent.invoke(
  {
    messages: [
      { role: "user", content: "What is the weather in San Francisco?" }
    ]
  },
  {
    callbacks: [traceHandler]
  }
);
```

### LangChain callback mapping

- `handleLLMStart` -> `prompt`
- `handleLLMEnd` -> `response`
- `handleLLMError` -> `error`
- `handleToolStart` -> `tool_call`
- `handleToolEnd` -> `tool_result`
- `handleToolError` -> `error`
- `handleChainStart` -> `note`
- `handleChainEnd` -> `note`

This means end users can keep writing LangChain applications the normal way and simply attach the recorder handler to get normalized traces.

## Is It Compatible With the Latest LangChain Docs?

Yes, at the integration layer.

The current LangChain JS docs emphasize `createAgent`, `tool`, modern callback-based tracing, and LangSmith observability. This project is compatible with that model because the adapter extends LangChain's callback handler surface from `@langchain/core` and emits normalized AFR events from callback hooks.

What that means in practice:

- You can use the recorder with current LangChain JS apps that support callbacks.
- You do not need to rewrite your agent logic.
- You attach the AFR handler where you would normally attach tracing callbacks.
- The product is not a first-party LangChain feature, so it is an external recorder that complements LangChain rather than replacing LangSmith.

If you are already using LangSmith tracing, AFR can still sit alongside that workflow as your product-specific trace capture layer.

## Collector API Flow

The collector receives normalized events and exposes endpoints that match the product workflow:

```http
POST /v1/events
GET /v1/traces
GET /v1/traces/:traceId
POST /v1/traces/:traceId/fork
GET /v1/traces/:traceId/lineage
GET /v1/traces/:aId/diff/:bId
GET /v1/traces/:traceId/analysis
```

That gives users a clean progression:

1. ingest events
2. inspect a trace
3. branch from a fork point
4. compare two runs
5. analyze for loops and failures

## Current Features Implemented Today

These are the features already present in the workspace today, described from an end-user perspective.

### 1. Capture and inspect traces

An individual developer can record prompt, response, tool, handoff, error, and note events, then fetch the complete trace later by ID.

Example use case: a support bot fails after calling a billing tool. The developer can open the trace and inspect the exact payload that went into the tool and the error that came back.

### 2. Local persistence in SQLite

The collector stores traces locally in SQLite with append-only event ingestion. This keeps setup simple for developers working on a single machine or a small team environment.

Example use case: a teammate restarts the server and still sees the same traces that were captured before the restart.

### 3. Fork a trace from a selected span

Users can create a derived trace from a chosen fork point and optionally override the prompt text on that forked branch.

Example use case: a developer wants to try a new system prompt without losing the original run. They fork the trace, adjust the prompt, and compare the two outcomes.

### 4. View lineage

The collector can return a lineage graph with parent/child relationships so users can understand how traces are related.

Example use case: a team wants to see how a parent trace produced several experimental child traces and navigate between them.

### 5. Compare related traces

The diff endpoint compares related traces and reports added, removed, and payload-changed events.

Example use case: one branch of an agent succeeds and another fails. The developer compares the two traces to find the first meaningful divergence.

### 6. Detect likely loops

The analysis pipeline identifies repeated sequences, recursive tool calls, and handoff cycles.

Example use case: an agent keeps calling the same tool with equivalent input. The analysis view highlights that as a likely loop so the user can stop the runaway behavior quickly.

### 7. Failure highlighting

Events marked as errors are surfaced in analysis output and are intended to be easy to spot in the trace view.

Example use case: a multi-agent flow partially succeeds, but a downstream tool fails. The developer can jump straight to the failure event instead of reading the whole trace manually.

## What This Product Is For

The product is meant to answer one question: what did the agent actually do?

It is useful when you need to:

- debug opaque agent behavior
- compare two versions of a workflow
- verify tool inputs and outputs
- inspect handoffs between agents
- catch repeated loops before they waste time or money

## What It Is Not

- It is not a generic logging library.
- It is not a replacement for your agent runtime.
- It is not tied to one model provider.
- It is not a hosted multi-tenant observability platform yet.

## Practical Example: One Developer, One Trace

```ts
import { FlightRecorder } from "@afr/sdk";

const recorder = new FlightRecorder({
  endpoint: "http://localhost:4317",
  actor: { id: "planner", name: "Planner" }
});

const rootSpanId = recorder.createSpanId();

await recorder.prompt({
  spanId: rootSpanId,
  parentSpanId: null,
  text: "Plan a 3-day trip to Tokyo with a $1500 budget"
});

await recorder.toolCall({
  parentSpanId: rootSpanId,
  toolId: "search_flights",
  input: { origin: "SFO", destination: "HND" }
});

await recorder.toolResult({
  parentSpanId: rootSpanId,
  toolId: "search_flights",
  output: { cheapestPrice: 842, currency: "USD" }
});

await recorder.response({
  parentSpanId: rootSpanId,
  text: "I found an itinerary that fits the budget."
});
```

In this flow, the user can later fetch the trace, inspect the tool payloads, and see exactly how the plan was produced.

## Practical Example: LangChain Agent With Tracing

```ts
import { createAgent, tool } from "langchain";
import * as z from "zod";
import { FlightRecorder } from "@afr/sdk";
import { createLangChainHandler } from "@afr/adapter-langchain";

const recorder = new FlightRecorder({
  endpoint: "http://localhost:4317",
  actor: { id: "research-agent" }
});

const handler = createLangChainHandler({ recorder });

const summarizeTool = tool(
  (input) => `Summary created for ${input.topic}`,
  {
    name: "summarize_topic",
    description: "Summarize a topic",
    schema: z.object({
      topic: z.string()
    })
  }
);

const agent = createAgent({
  model: "gpt-5.4",
  tools: [summarizeTool]
});

await agent.invoke(
  { messages: [{ role: "user", content: "Summarize today's notes" }] },
  { callbacks: [handler] }
);
```

This is the recommended path for users already on LangChain: keep the agent code, add the recorder handler, and let AFR capture the run.

## Bottom Line

AeroGraph is the tracing layer for people who want inspectable, replay-safe AI execution records. The SDK is the API users call in their code, the collector stores and serves the traces, and the LangChain adapter makes the system usable in modern LangChain applications without changing the agent logic itself.