import { sortTraceEventsDeterministic, type TraceEvent } from "@afr/contracts";
import type { Node, Edge } from "reactflow";

export function buildGraph(events: TraceEvent[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Basic layout state
  let x = 100;
  let y = 100;

  for (const event of events) {
    nodes.push({
      id: event.spanId,
      position: { x, y },
      data: { event },
      type: "default",
      // Failure highlighting using event.status only (T026)
      style: {
        border: event.status === "error" ? "2px solid red" : "1px solid #ddd",
        background: event.status === "error" ? "#ffe6e6" : "white",
        padding: "10px",
        borderRadius: "5px",
        width: 200
      }
    });

    if (event.parentSpanId) {
      edges.push({
        id: `e-${event.parentSpanId}-${event.spanId}`,
        source: event.parentSpanId,
        target: event.spanId
      });
    }

    y += 100; // simple vertical layout for MVP
  }

  return { nodes, edges };
}

export function computePlaybackState(events: TraceEvent[], cursorIndex: number): TraceEvent[] {
  const sorted = sortTraceEventsDeterministic(events);
  return sorted.slice(0, cursorIndex + 1);
}

/**
 * Apply diff highlighting to graph nodes (T033).
 * Changed spanIds get a distinct visual style.
 * Deterministic: styling is determined solely by the changedSpanIds set.
 */
export function applyDiffHighlighting(
  nodes: Node[],
  changedSpanIds: Set<string>
): Node[] {
  return nodes.map((node) => {
    if (!changedSpanIds.has(node.id)) return node;
    return {
      ...node,
      style: {
        ...node.style,
        border: "2px solid #f59e0b",
        background: "rgba(245,158,11,0.12)",
        boxShadow: "0 0 10px rgba(245,158,11,0.3)"
      }
    };
  });
}

/**
 * Apply loop warning highlighting to graph nodes (T045).
 * Loop-flagged spanIds get a distinct visual style.
 * Deterministic: styling is determined solely by the loopSpanIds set.
 */
export function applyLoopHighlighting(
  nodes: Node[],
  loopSpanIds: Set<string>
): Node[] {
  return nodes.map((node) => {
    if (!loopSpanIds.has(node.id)) return node;
    return {
      ...node,
      style: {
        ...node.style,
        border: "2px solid #8b5cf6",
        background: "rgba(139,92,246,0.12)",
        boxShadow: "0 0 10px rgba(139,92,246,0.3)"
      }
    };
  });
}
