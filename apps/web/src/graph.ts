import { sortTraceEventsDeterministic, type TraceEvent } from "@aerograph/contracts";
import { MarkerType, type Node, type Edge } from "reactflow";

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
        target: event.spanId,
        animated: true,
        style: { stroke: "rgba(99,102,241,0.75)", strokeWidth: 2.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "rgba(129,140,248,0.9)",
          width: 16,
          height: 16
        }
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
      className: (node.className ?? "") + " node-diff-highlight",
      style: {
        ...node.style,
        border: "2.5px solid #f59e0b",
        background: "rgba(245,158,11,0.18)",
        boxShadow: "0 0 0 3px rgba(245,158,11,0.25), 0 0 18px rgba(245,158,11,0.45)"
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
      className: (node.className ?? "") + " node-loop-highlight",
      style: {
        ...node.style,
        border: "2.5px solid #a78bfa",
        background: "rgba(139,92,246,0.18)",
        boxShadow: "0 0 0 3px rgba(139,92,246,0.3), 0 0 20px rgba(139,92,246,0.5)"
      }
    };
  });
}
