import type { TraceLineageGraph, TraceLineageEdge } from "@afr/contracts";

export function getLineageParentEdge(
  graph: TraceLineageGraph,
  traceId: string
): TraceLineageEdge | undefined {
  return graph.edges.find((e) => e.childTraceId === traceId);
}

export function buildLineageBreadcrumb(graph: TraceLineageGraph, traceId: string): string[] {
  const path: string[] = [];
  let current: string | undefined = traceId;

  while (current) {
    path.push(current);
    const parentEdge = getLineageParentEdge(graph, current);
    if (!parentEdge) break;
    current = parentEdge.parentTraceId;
  }

  return path.reverse();
}

export function listSiblingTraceIds(graph: TraceLineageGraph, traceId: string): string[] {
  const parentEdge = getLineageParentEdge(graph, traceId);
  if (!parentEdge) return [];

  const siblings = graph.edges
    .filter((e) => e.parentTraceId === parentEdge.parentTraceId)
    .slice()
    .sort((a, b) => {
      const t = a.createdAt.localeCompare(b.createdAt);
      if (t !== 0) return t;
      return a.childTraceId.localeCompare(b.childTraceId);
    })
    .map((e) => e.childTraceId)
    .filter((id) => id !== traceId);

  return siblings;
}

export function getForkPointSpanId(graph: TraceLineageGraph, traceId: string): string | null {
  const parentEdge = getLineageParentEdge(graph, traceId);
  return parentEdge?.forkedFromSpanId ?? null;
}
