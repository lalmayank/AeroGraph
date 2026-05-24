import { sortTraceEventsDeterministic, type TraceEvent } from "@afr/contracts";

export type HandoffCycleWarning = {
  kind: "handoff_cycle";
  severity: "low" | "medium" | "high";
  reason: string;
  spanIds: string[];
};

/**
 * Detect handoff cycles: graph cycles in the agent-to-agent handoff chain.
 *
 * Algorithm:
 * 1. Build a directed graph of handoff edges: fromAgentId → toAgentId.
 * 2. Run DFS cycle detection on the graph.
 * 3. For each cycle, collect the spanIds of the handoff events that form it.
 *
 * Also detect repeated handoff sequences (same edge appearing 2+ times).
 */
export function detectHandoffCycles(events: readonly TraceEvent[]): HandoffCycleWarning[] {
  const sorted = sortTraceEventsDeterministic([...events]);

  // Collect handoff events
  const handoffEvents = sorted.filter(
    (e): e is Extract<TraceEvent, { kind: "handoff" }> => e.kind === "handoff"
  );

  if (handoffEvents.length < 2) return [];

  // Build adjacency list: fromAgentId -> [(toAgentId, spanId)]
  const adjacency = new Map<string, Array<{ to: string; spanId: string }>>();
  for (const e of handoffEvents) {
    const from = e.payload.fromAgentId;
    const to = e.payload.toAgentId;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ to, spanId: e.spanId });
  }

  const warnings: HandoffCycleWarning[] = [];
  const seenCycles = new Set<string>();

  // DFS cycle detection
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stackPath: Array<{ agent: string; spanId: string }> = [];

  function dfs(agent: string): void {
    if (inStack.has(agent)) {
      // Found a cycle — collect the cycle segment
      const cycleStart = stackPath.findIndex((s) => s.agent === agent);
      if (cycleStart >= 0) {
        const cycleSegment = stackPath.slice(cycleStart);
        const cycleKey = cycleSegment.map((s) => s.agent).join("→");
        if (!seenCycles.has(cycleKey)) {
          seenCycles.add(cycleKey);
          const spanIds = cycleSegment.map((s) => s.spanId).filter(Boolean);
          warnings.push({
            kind: "handoff_cycle",
            severity: cycleSegment.length >= 4 ? "high" : "medium",
            reason: `Handoff cycle detected: ${cycleKey}`,
            spanIds
          });
        }
      }
      return;
    }
    if (visited.has(agent)) return;
    visited.add(agent);
    inStack.add(agent);

    const neighbors = adjacency.get(agent) ?? [];
    for (const { to, spanId } of neighbors) {
      stackPath.push({ agent: to, spanId });
      dfs(to);
      stackPath.pop();
    }

    inStack.delete(agent);
  }

  // Start DFS from every node
  for (const from of adjacency.keys()) {
    stackPath.push({ agent: from, spanId: "" });
    dfs(from);
    stackPath.pop();
  }

  // Also detect repeated handoff edges (same pair of agents, 2+ times)
  const edgeCounts = new Map<string, string[]>();
  for (const e of handoffEvents) {
    const edgeKey = `${e.payload.fromAgentId}→${e.payload.toAgentId}`;
    if (!edgeCounts.has(edgeKey)) edgeCounts.set(edgeKey, []);
    edgeCounts.get(edgeKey)!.push(e.spanId);
  }

  for (const [edgeKey, spanIds] of edgeCounts) {
    if (spanIds.length >= 2 && !seenCycles.has(edgeKey)) {
      seenCycles.add(edgeKey);
      warnings.push({
        kind: "handoff_cycle",
        severity: spanIds.length >= 4 ? "high" : "low",
        reason: `Repeated handoff edge (${edgeKey}) occurred ${spanIds.length} times`,
        spanIds
      });
    }
  }

  // Deterministic ordering: by first spanId's occurredAt then spanId
  warnings.sort((a, b) => {
    const aSpan = sorted.find((e) => e.spanId === a.spanIds[0]);
    const bSpan = sorted.find((e) => e.spanId === b.spanIds[0]);
    const t = (aSpan?.occurredAt ?? "").localeCompare(bSpan?.occurredAt ?? "");
    if (t !== 0) return t;
    return (a.spanIds[0] ?? "").localeCompare(b.spanIds[0] ?? "");
  });

  return warnings;
}
