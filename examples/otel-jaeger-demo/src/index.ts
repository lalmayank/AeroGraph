import { exportEventsToOtlp } from "@aerograph/otel";
import type { TraceEvent } from "@aerograph/contracts";
import { randomBytes } from "crypto";

// Jaeger OTLP/HTTP Trace Endpoint
const JAEGER_URL = "http://localhost:4318/v1/traces";

function generateTraceId(): string {
  return randomBytes(16).toString("hex");
}

function generateSpanId(): string {
  return randomBytes(8).toString("hex");
}

function createEvent(
  traceId: string,
  kind: TraceEvent["kind"],
  overrides: Partial<TraceEvent> = {}
): TraceEvent {
  return {
    traceId,
    spanId: generateSpanId(),
    parentSpanId: null,
    kind,
    actor: { id: "agent-jaeger-demo", kind: "agent", name: "DemoAgent" },
    occurredAt: new Date().toISOString(),
    status: "ok",
    payload: {},
    links: [],
    ...overrides,
  } as TraceEvent;
}

async function sendToJaeger(events: TraceEvent[]) {
  const exportRequest = exportEventsToOtlp(events, { serviceName: "aerograph-jaeger-demo" });
  
  console.log(`Sending ${events.length} events to Jaeger at ${JAEGER_URL}...`);
  try {
    const response = await fetch(JAEGER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(exportRequest),
    });

    if (response.ok) {
      console.log("✅ Successfully sent traces to Jaeger.");
    } else {
      const text = await response.text();
      console.error(`❌ Failed to send traces to Jaeger. Status: ${response.status}`, text);
    }
  } catch (error) {
    console.error("❌ Error sending to Jaeger. Is Docker running?", error);
  }
}

async function main() {
  const traceId = generateTraceId();
  const events: TraceEvent[] = [];

  // 1. Root Prompt
  const prompt = createEvent(traceId, "prompt", {
    payload: { message: "Search for the capital of France and translate to Spanish." }
  });
  events.push(prompt);

  // 2. Tool Call (Child of Prompt)
  const toolCall = createEvent(traceId, "tool_call", {
    parentSpanId: prompt.spanId,
    payload: { tool_name: "web_search", tool_input: { query: "Capital of France" } }
  });
  events.push(toolCall);

  // 3. Tool Result (Child of Tool Call)
  const toolResult = createEvent(traceId, "tool_result", {
    parentSpanId: toolCall.spanId,
    payload: { tool_name: "web_search", result: "Paris is the capital of France." }
  });
  events.push(toolResult);

  // 4. Handoff to another agent
  const traceId2 = generateTraceId();
  const handoff = createEvent(traceId, "handoff", {
    parentSpanId: prompt.spanId,
    payload: { from_agent_id: "agent-jaeger-demo", to_agent_id: "agent-translator", instruction: "Translate 'Paris is the capital of France' to Spanish." },
  });
  events.push(handoff);

  // 5. Translator agent prompt
  const translatorPrompt = createEvent(traceId2, "prompt", {
    actor: { id: "agent-translator", kind: "agent", name: "TranslatorAgent" },
    payload: { message: "Translate 'Paris is the capital of France' to Spanish." },
    links: [{ rel: "follows", spanId: handoff.spanId }] // Link back to original trace
  });
  events.push(translatorPrompt);

  // 6. Translator response
  const translatorResponse = createEvent(traceId2, "response", {
    parentSpanId: translatorPrompt.spanId,
    actor: { id: "agent-translator", kind: "agent", name: "TranslatorAgent" },
    payload: { message: "París es la capital de Francia." }
  });
  events.push(translatorResponse);

  // 7. Original agent response
  const finalResponse = createEvent(traceId, "response", {
    parentSpanId: prompt.spanId,
    payload: { message: "París es la capital de Francia." }
  });
  events.push(finalResponse);

  await sendToJaeger(events);
}

main().catch(console.error);
