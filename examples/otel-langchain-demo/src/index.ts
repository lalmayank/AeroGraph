import { exportEventsToOtlp } from "@aerograph/otel";
import { createLangChainHandler } from "@aerograph/adapter-langchain";
import { FlightRecorder } from "@aerograph/sdk";
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { createHash } from "crypto";
import type { TraceEvent } from "@aerograph/contracts";

const JAEGER_URL = "http://localhost:4318/v1/traces";

async function sendToJaeger(events: TraceEvent[]) {
  if (events.length === 0) return;
  const exportRequest = exportEventsToOtlp(events, { serviceName: "aerograph-langchain-demo" });
  
  console.log(`Sending ${events.length} LangChain events to Jaeger at ${JAEGER_URL}...`);
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
  const events: TraceEvent[] = [];

  // Create a FlightRecorder that intercepts events locally
  const recorder = new FlightRecorder({
    endpoint: "http://dummy",
    actor: { id: "agent-langchain-demo", name: "LangChain Demo Agent" },
    fetchFn: async (url, options) => {
      const event = JSON.parse(options?.body as string) as TraceEvent;
      
      // Normalize IDs to OTLP format (32-char traceId, 16-char spanId)
      const normTraceId = createHash('md5').update(event.traceId).digest('hex'); // 32 chars
      const normSpanId = createHash('sha256').update(event.spanId).digest('hex').substring(0, 16); // 16 chars
      const normParentId = event.parentSpanId ? createHash('sha256').update(event.parentSpanId).digest('hex').substring(0, 16) : null;
      
      events.push({
        ...event,
        traceId: normTraceId,
        spanId: normSpanId,
        parentSpanId: normParentId
      });
      return { ok: true, text: async () => "OK" } as any;
    }
  });

  // Create the LangChain handler
  const handler = createLangChainHandler({ recorder });

  // Create a simple LangChain pipeline
  const prompt = PromptTemplate.fromTemplate("Tell me a short joke about {topic}.");
  const llm = new RunnableLambda({
    func: async (input: string) => "Why did the programmer quit his job? Because he didn't get arrays!"
  });

  const chain = RunnableSequence.from([prompt, llm]);

  console.log("Running LangChain pipeline...");
  
  // Execute the chain and pass the tracer
  await chain.invoke(
    { topic: "programming" },
    { callbacks: [handler as any] }
  );

  // Send collected events to Jaeger
  await sendToJaeger(events);
}

main().catch(console.error);
