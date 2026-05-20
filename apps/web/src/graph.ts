import type { TraceEvent } from "@afr/contracts";
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
  // Sort events by occurredAt (T029)
  const sorted = [...events].sort((a, b) => {
    return new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
  });
  
  return sorted.slice(0, cursorIndex + 1);
}
