import { describe, expect, it } from "vitest";
import type { TraceLineageGraph } from "@afr/contracts";
import { buildLineageBreadcrumb, getForkPointSpanId, listSiblingTraceIds } from "./lineage";

describe("web: lineage utilities", () => {
  it("buildLineageBreadcrumb returns root→current", () => {
    const graph: TraceLineageGraph = {
      rootTraceId: "t_root",
      nodes: [],
      edges: [
        {
          parentTraceId: "t_root",
          childTraceId: "t_a",
          forkedFromSpanId: "s6",
          createdAt: "2026-05-20T00:00:00.000Z",
          overrides: { promptText: "A" }
        },
        {
          parentTraceId: "t_a",
          childTraceId: "t_b",
          forkedFromSpanId: "s8",
          createdAt: "2026-05-20T00:00:01.000Z",
          overrides: { promptText: "B" }
        }
      ]
    };

    expect(buildLineageBreadcrumb(graph, "t_b")).toEqual(["t_root", "t_a", "t_b"]);
  });

  it("listSiblingTraceIds sorts deterministically and excludes self", () => {
    const graph: TraceLineageGraph = {
      rootTraceId: "t_root",
      nodes: [],
      edges: [
        {
          parentTraceId: "t_root",
          childTraceId: "t_b",
          forkedFromSpanId: "s6",
          createdAt: "2026-05-20T00:00:02.000Z"
        },
        {
          parentTraceId: "t_root",
          childTraceId: "t_a",
          forkedFromSpanId: "s6",
          createdAt: "2026-05-20T00:00:01.000Z"
        },
        {
          parentTraceId: "t_root",
          childTraceId: "t_c",
          forkedFromSpanId: "s6",
          createdAt: "2026-05-20T00:00:01.000Z"
        }
      ]
    };

    expect(listSiblingTraceIds(graph, "t_b")).toEqual(["t_a", "t_c"]);
  });

  it("getForkPointSpanId returns fork span for derived trace", () => {
    const graph: TraceLineageGraph = {
      rootTraceId: "t_root",
      nodes: [],
      edges: [
        {
          parentTraceId: "t_root",
          childTraceId: "t_child",
          forkedFromSpanId: "s6",
          createdAt: "2026-05-20T00:00:00.000Z"
        }
      ]
    };

    expect(getForkPointSpanId(graph, "t_child")).toBe("s6");
    expect(getForkPointSpanId(graph, "t_root")).toBe(null);
  });
});
