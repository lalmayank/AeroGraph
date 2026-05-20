import { describe, expect, it } from "vitest";
import { buildGraph, computePlaybackState } from "./graph";

describe("web: graph utilities", () => {
  it("buildGraph maps trace events to nodes and edges", () => {
    const events = [
      {
        traceId: "t-1",
        spanId: "s-1",
        parentSpanId: null,
        occurredAt: "2026-05-20T00:00:00.000Z",
        kind: "prompt",
        actor: { kind: "agent", id: "agent-1" },
        status: "ok",
        payload: { text: "Hello" }
      },
      {
        traceId: "t-1",
        spanId: "s-2",
        parentSpanId: "s-1",
        occurredAt: "2026-05-20T00:00:01.000Z",
        kind: "response",
        actor: { kind: "agent", id: "agent-1" },
        status: "ok",
        payload: { text: "Hi" }
      }
    ] as any;

    const graph = buildGraph(events);
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].source).toBe("s-1");
    expect(graph.edges[0].target).toBe("s-2");
  });

  it("computePlaybackState limits visible events by cursor index", () => {
    const events = [
      { occurredAt: "1", spanId: "s1" },
      { occurredAt: "2", spanId: "s2" },
      { occurredAt: "3", spanId: "s3" }
    ] as any;

    const visible = computePlaybackState(events, 1);
    expect(visible.length).toBe(2);
    expect(visible[1].spanId).toBe("s2");
  });
});
