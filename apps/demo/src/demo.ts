import { FlightRecorder } from "@afr/sdk";

const endpoint = process.env.COLLECTOR_URL ?? "http://localhost:4317";

async function run() {
  const frPlanner = new FlightRecorder({ endpoint, actor: { id: "agent-planner", name: "Planner" } });
  const traceId = frPlanner.traceId;

  const root = await frPlanner.prompt({ parentSpanId: null, title: "User request", text: "Debug my multi-agent run" });
  await frPlanner.response({ parentSpanId: root.spanId, title: "Plan", text: "1) Search 2) Execute" });

  const toolCall = await frPlanner.toolCall({
    parentSpanId: root.spanId,
    toolId: "tool-search",
    toolName: "search",
    input: { query: "agent flight recorder" }
  });
  await frPlanner.toolResult({
    parentSpanId: toolCall.spanId,
    toolId: "tool-search",
    toolName: "search",
    output: { results: ["result-1", "result-2"] }
  });

  await frPlanner.handoff({ parentSpanId: root.spanId, fromAgentId: "agent-planner", toAgentId: "agent-executor", reason: "execute" });

  const frExec = new FlightRecorder({ endpoint, traceId, actor: { id: "agent-executor", name: "Executor" } });
  const execPrompt = await frExec.prompt({ parentSpanId: root.spanId, title: "Execute", text: "Implement the plan" });
  await frExec.response({ parentSpanId: execPrompt.spanId, title: "Done", text: "Executed steps" });

  // Add a repeated sequence to trigger loop heuristic.
  const loop1 = await frExec.toolCall({ parentSpanId: execPrompt.spanId, toolId: "tool-retry", toolName: "retryable", input: { attempt: 1 } });
  await frExec.toolResult({ parentSpanId: loop1.spanId, toolId: "tool-retry", toolName: "retryable", output: { ok: false } });
  const loop2 = await frExec.toolCall({ parentSpanId: execPrompt.spanId, toolId: "tool-retry", toolName: "retryable", input: { attempt: 2 } });
  await frExec.toolResult({ parentSpanId: loop2.spanId, toolId: "tool-retry", toolName: "retryable", output: { ok: false } });

  // Add a failure.
  await frExec.error({ parentSpanId: execPrompt.spanId, title: "Tool failed", message: "retryable tool failed", details: { attempts: 2 } });

  // eslint-disable-next-line no-console
  console.log(`Emitted demo trace: ${traceId}`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
