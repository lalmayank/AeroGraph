/**
 * Phase 2 smoke demo script.
 *
 * Demonstrates the full Phase 2 flow:
 * 1. Emit a base multi-agent trace
 * 2. Fork the trace at a selected span
 * 3. Call the diff endpoint (base vs fork)
 * 4. Call the analysis endpoint on the base trace
 *
 * Run with: npx tsx apps/demo/src/phase2-demo.ts
 * Requires the collector to be running on http://localhost:4317
 */

import { FlightRecorder } from "@aerograph/sdk";

const COLLECTOR_URL = process.env.COLLECTOR_URL ?? "http://localhost:4317";

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${COLLECTOR_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${COLLECTOR_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${await res.text()}`);
  return res.json();
}

async function run() {
  // eslint-disable-next-line no-console
  const log = console.log;

  log("\n=== Phase 2 Smoke Demo ===\n");

  // 1. Emit base trace with a multi-agent handoff pattern
  const frPlanner = new FlightRecorder({
    endpoint: COLLECTOR_URL,
    actor: { id: "agent-planner", name: "Planner" }
  });
  const traceId = frPlanner.traceId;
  log(`[1] Emitting base trace: ${traceId}`);

  const root = await frPlanner.prompt({ parentSpanId: null, title: "Plan", text: "Create a plan" });
  await frPlanner.response({ parentSpanId: root.spanId, title: "Plan ready", text: "Step 1, Step 2, Step 3" });

  const toolCall = await frPlanner.toolCall({
    parentSpanId: root.spanId,
    toolId: "tool-search",
    toolName: "search",
    input: { query: "phase 2 demo" }
  });
  await frPlanner.toolResult({
    parentSpanId: toolCall.spanId,
    toolId: "tool-search",
    toolName: "search",
    output: { results: ["result-1"] }
  });

  await frPlanner.handoff({
    parentSpanId: root.spanId,
    fromAgentId: "agent-planner",
    toAgentId: "agent-executor",
    reason: "hand off to executor"
  });

  const frExec = new FlightRecorder({
    endpoint: COLLECTOR_URL,
    traceId,
    actor: { id: "agent-executor", name: "Executor" }
  });

  const execPrompt = await frExec.prompt({
    parentSpanId: root.spanId,
    title: "Execute",
    text: "Execute the plan"
  });

  // Add repeated tool calls to trigger loop detection
  const tool1 = await frExec.toolCall({ parentSpanId: execPrompt.spanId, toolId: "tool-retry", toolName: "retryable", input: { query: "x" } });
  await frExec.toolResult({ parentSpanId: tool1.spanId, toolId: "tool-retry", toolName: "retryable", output: { ok: false } });
  const tool2 = await frExec.toolCall({ parentSpanId: execPrompt.spanId, toolId: "tool-retry", toolName: "retryable", input: { query: "x" } });
  await frExec.toolResult({ parentSpanId: tool2.spanId, toolId: "tool-retry", toolName: "retryable", output: { ok: false } });
  const tool3 = await frExec.toolCall({ parentSpanId: execPrompt.spanId, toolId: "tool-retry", toolName: "retryable", input: { query: "x" } });
  await frExec.toolResult({ parentSpanId: tool3.spanId, toolId: "tool-retry", toolName: "retryable", output: { ok: true } });

  await frExec.response({ parentSpanId: execPrompt.spanId, title: "Done", text: "Execution complete" });

  log(`   Emitted trace with ${6 + 6} spans`);

  // Small delay to let collector ingest
  await new Promise((r) => setTimeout(r, 300));

  // 2. Fork at the root prompt span
  log(`\n[2] Forking trace at span: ${root.spanId}`);
  const forkResult = (await post(`/v1/traces/${traceId}/fork`, {
    forkFromSpanId: root.spanId,
    overrides: { promptText: "Create an alternative plan" }
  })) as { traceId: string };
  const childTraceId = forkResult.traceId;
  log(`   Forked → child trace: ${childTraceId}`);

  // 3. Lineage graph
  log(`\n[3] Fetching lineage for base trace...`);
  const lineage = (await get(`/v1/traces/${traceId}/lineage`)) as any;
  log(`   Root: ${lineage.rootTraceId}`);
  log(`   Nodes: ${lineage.nodes.length}`);
  log(`   Edges: ${lineage.edges.length}`);

  // 4. Diff
  log(`\n[4] Diffing ${traceId} vs ${childTraceId}...`);
  const diff = (await get(`/v1/traces/${traceId}/diff/${childTraceId}`)) as any;
  log(`   Changed events: ${diff.changed.length}`);
  if (diff.divergence) {
    log(`   Divergence point: ${JSON.stringify(diff.divergence)}`);
  }

  // 5. Analysis
  log(`\n[5] Analyzing base trace for loops...`);
  const analysis = (await get(`/v1/traces/${traceId}/analysis`)) as any;
  log(`   Events: ${analysis.stats.eventCount}`);
  log(`   Actors: ${analysis.stats.actorCount}`);
  log(`   Loop warnings: ${analysis.loops.length}`);
  for (const w of analysis.loops) {
    log(`     [${w.severity}] ${w.kind}: ${w.reason}`);
  }
  log(`   Failures: ${analysis.failures.length}`);

  log("\n=== Phase 2 Smoke Demo Complete ===\n");
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
